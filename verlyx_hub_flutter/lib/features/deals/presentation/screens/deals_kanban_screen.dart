import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../my_companies/providers/my_companies_provider.dart';
import '../../providers/deals_provider.dart';
import '../../data/models/deal_model.dart';

class DealsKanbanScreen extends ConsumerStatefulWidget {
  final String? clientId;

  const DealsKanbanScreen({
    Key? key,
    this.clientId,
  }) : super(key: key);

  @override
  ConsumerState<DealsKanbanScreen> createState() => _DealsKanbanScreenState();
}

class _DealsKanbanScreenState extends ConsumerState<DealsKanbanScreen> {
  final _scrollController = ScrollController();
  String? _selectedPriority;

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  final List<String> _stages = [
    'LEAD',
    'QUALIFIED',
    'PROPOSAL',
    'NEGOTIATION',
    'CLOSED_WON',
    'CLOSED_LOST',
  ];

  @override
  Widget build(BuildContext context) {
    final selectedCompany = ref.watch(selectedMyCompanyProvider);

    if (selectedCompany == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Pipeline de Ventas')),
        body: const Center(
          child: Text('Selecciona una empresa primero'),
        ),
      );
    }

    final dealsAsync = ref.watch(dealsListProvider(DealsParams(
      myCompanyId: selectedCompany.id,
      clientId: widget.clientId,
    )));

    final statsAsync = ref.watch(pipelineStatsProvider(selectedCompany.id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pipeline de Ventas'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _selectedPriority = value == 'all' ? null : value;
              });
              ref.invalidate(dealsListProvider);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('Todas')),
              const PopupMenuItem(value: 'URGENT', child: Text('🔴 Urgente')),
              const PopupMenuItem(value: 'HIGH', child: Text('🟠 Alta')),
              const PopupMenuItem(value: 'MEDIUM', child: Text('🟡 Media')),
              const PopupMenuItem(value: 'LOW', child: Text('🟢 Baja')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(dealsListProvider);
              ref.invalidate(pipelineStatsProvider);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Estadísticas del pipeline
          statsAsync.when(
            data: (stats) => _buildStatsBar(stats),
            loading: () => const LinearProgressIndicator(),
            error: (_, __) => const SizedBox.shrink(),
          ),

          // Kanban board
          Expanded(
            child: dealsAsync.when(
              data: (deals) {
                final filteredDeals = _selectedPriority != null
                    ? deals
                        .where((d) => d.priority == _selectedPriority)
                        .toList()
                    : deals;

                return ListView.builder(
                  controller: _scrollController,
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.all(16),
                  itemCount: _stages.length,
                  itemBuilder: (context, index) {
                    final stage = _stages[index];
                    final stageDeals = filteredDeals
                        .where((deal) => deal.stage == stage)
                        .toList();

                    return _buildStageColumn(stage, stageDeals);
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 64, color: Colors.red),
                    const SizedBox(height: 16),
                    Text('Error: $error'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.invalidate(dealsListProvider),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDealDialog(context, selectedCompany.id),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildStatsBar(List<PipelineStats> stats) {
    final total = stats.fold<double>(
      0,
      (sum, stat) => sum + stat.totalWeighted,
    );
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Container(
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).cardColor,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Total Ponderado',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
              Text(
                currencyFormat.format(total),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          Row(
            children: stats.map((stat) {
              final percentage = total > 0 ? (stat.totalWeighted / total * 100) : 0;
              return Padding(
                padding: const EdgeInsets.only(left: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _formatStage(stat.stage),
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    Text(
                      '${stat.count} (${percentage.toStringAsFixed(0)}%)',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStageColumn(String stage, List<DealModel> deals) {
    return Container(
      width: 300,
      margin: const EdgeInsets.only(right: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _getStageColor(stage).withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _formatStage(stage),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _getStageColor(stage),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStageColor(stage),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${deals.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Cards
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(8)),
              ),
              child: deals.isEmpty
                  ? Center(
                      child: Text(
                        'Sin deals',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: deals.length,
                      itemBuilder: (context, index) {
                        return _buildDealCard(deals[index], stage);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDealCard(DealModel deal, String currentStage) {
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 0);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () {
          // TODO: Navigate to detail screen
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Título y prioridad
              Row(
                children: [
                  Expanded(
                    child: Text(
                      deal.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _getPriorityIcon(deal.priority),
                ],
              ),
              const SizedBox(height: 8),

              // Monto y probabilidad
              if (deal.amount != null)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      currencyFormat.format(deal.amount),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.blue[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${deal.probability}%',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.blue,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 8),

              // Días en etapa
              Text(
                '${deal.daysInStage} días en esta etapa',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),

              // Próxima acción
              if (deal.nextAction != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.flag, size: 12, color: Colors.orange[700]),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        deal.nextAction!,
                        style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 8),

              // Acciones
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (currentStage != 'CLOSED_WON' && currentStage != 'CLOSED_LOST')
                    TextButton.icon(
                      icon: const Icon(Icons.arrow_forward, size: 16),
                      label: const Text('Mover'),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: const Size(0, 32),
                      ),
                      onPressed: () => _showMoveStageDialog(context, deal),
                    ),
                  if (currentStage == 'CLOSED_WON')
                    TextButton.icon(
                      icon: const Icon(Icons.folder_open, size: 16),
                      label: const Text('Proyecto'),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        minimumSize: const Size(0, 32),
                      ),
                      onPressed: () => _showCreateProjectDialog(context, deal),
                    ),
                  PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    onSelected: (value) {
                      if (value == 'edit') {
                        _showEditDealDialog(context, deal);
                      } else if (value == 'delete') {
                        _showDeleteDialog(context, deal);
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: Text('Editar')),
                      const PopupMenuItem(value: 'delete', child: Text('Eliminar')),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStageColor(String stage) {
    switch (stage) {
      case 'LEAD':
        return Colors.grey;
      case 'QUALIFIED':
        return Colors.blue;
      case 'PROPOSAL':
        return Colors.purple;
      case 'NEGOTIATION':
        return Colors.orange;
      case 'CLOSED_WON':
        return Colors.green;
      case 'CLOSED_LOST':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _getPriorityIcon(String priority) {
    switch (priority) {
      case 'URGENT':
        return const Icon(Icons.circle, size: 12, color: Colors.red);
      case 'HIGH':
        return const Icon(Icons.circle, size: 12, color: Colors.orange);
      case 'MEDIUM':
        return const Icon(Icons.circle, size: 12, color: Colors.yellow);
      case 'LOW':
        return const Icon(Icons.circle, size: 12, color: Colors.green);
      default:
        return const SizedBox.shrink();
    }
  }

  String _formatStage(String stage) {
    const stageMap = {
      'LEAD': 'Lead',
      'QUALIFIED': 'Calificado',
      'PROPOSAL': 'Propuesta',
      'NEGOTIATION': 'Negociación',
      'CLOSED_WON': 'Ganado',
      'CLOSED_LOST': 'Perdido',
    };
    return stageMap[stage] ?? stage;
  }

  void _showCreateDealDialog(BuildContext context, String myCompanyId) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Formulario de creación en desarrollo')),
    );
  }

  void _showEditDealDialog(BuildContext context, DealModel deal) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Formulario de edición en desarrollo')),
    );
  }

  void _showMoveStageDialog(BuildContext context, DealModel deal) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Diálogo de cambio de etapa en desarrollo')),
    );
  }

  void _showCreateProjectDialog(BuildContext context, DealModel deal) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Creación de proyecto en desarrollo')),
    );
  }

  void _showDeleteDialog(BuildContext context, DealModel deal) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar deal'),
        content: Text('¿Estás seguro de eliminar "${deal.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ref
                    .read(dealsRepositoryProvider)
                    .deleteDeal(deal.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Deal eliminado')),
                  );
                }
                ref.invalidate(dealsListProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }
}
