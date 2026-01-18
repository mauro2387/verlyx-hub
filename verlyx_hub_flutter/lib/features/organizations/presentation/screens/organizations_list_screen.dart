import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../my_companies/providers/my_companies_provider.dart';
import '../../providers/organizations_provider.dart';
import '../../data/models/organization_model.dart';

class OrganizationsListScreen extends ConsumerStatefulWidget {
  final String? clientId;

  const OrganizationsListScreen({
    Key? key,
    this.clientId,
  }) : super(key: key);

  @override
  ConsumerState<OrganizationsListScreen> createState() =>
      _OrganizationsListScreenState();
}

class _OrganizationsListScreenState
    extends ConsumerState<OrganizationsListScreen> {
  final _searchController = TextEditingController();
  bool _showHierarchy = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedCompany = ref.watch(selectedMyCompanyProvider);

    if (selectedCompany == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Organizaciones')),
        body: const Center(
          child: Text('Selecciona una empresa primero'),
        ),
      );
    }

    final organizationsAsync = _showHierarchy && widget.clientId != null
        ? ref.watch(organizationHierarchyProvider(widget.clientId!))
        : ref.watch(organizationsListProvider(OrganizationsParams(
            myCompanyId: selectedCompany.id,
            clientId: widget.clientId,
          )));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Organizaciones'),
        actions: [
          if (widget.clientId != null)
            IconButton(
              icon: Icon(_showHierarchy ? Icons.list : Icons.account_tree),
              onPressed: () {
                setState(() {
                  _showHierarchy = !_showHierarchy;
                });
              },
              tooltip: _showHierarchy
                  ? 'Vista de lista'
                  : 'Vista de jerarquía',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(_showHierarchy && widget.clientId != null
                  ? organizationHierarchyProvider(widget.clientId!)
                  : organizationsListProvider(OrganizationsParams(
                      myCompanyId: selectedCompany.id,
                      clientId: widget.clientId,
                    )));
            },
          ),
        ],
      ),
      body: organizationsAsync.when(
        data: (organizations) {
          if (organizations.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.business_outlined,
                      size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No hay organizaciones',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: () => _showCreateDialog(context, selectedCompany.id),
                    icon: const Icon(Icons.add),
                    label: const Text('Crear organización'),
                  ),
                ],
              ),
            );
          }

          return Column(
            children: [
              // Barra de búsqueda
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Buscar organizaciones...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  onChanged: (value) => setState(() {}),
                ),
              ),

              // Lista de organizaciones
              Expanded(
                child: _showHierarchy
                    ? _buildHierarchyView(organizations)
                    : _buildListView(organizations),
              ),
            ],
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
                onPressed: () => ref.invalidate(organizationsListProvider),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context, selectedCompany.id),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildListView(List<OrganizationModel> organizations) {
    final filtered = _filterOrganizations(organizations);

    return ListView.builder(
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final org = filtered[index];
        return _buildOrganizationCard(org);
      },
    );
  }

  Widget _buildHierarchyView(List<OrganizationModel> organizations) {
    return ListView.builder(
      itemCount: organizations.length,
      itemBuilder: (context, index) {
        return _buildHierarchyNode(organizations[index], 0);
      },
    );
  }

  Widget _buildHierarchyNode(OrganizationModel org, int level) {
    return Column(
      children: [
        Padding(
          padding: EdgeInsets.only(left: level * 24.0),
          child: _buildOrganizationCard(org, level: level),
        ),
        if (org.children != null)
          ...org.children!.map((child) => _buildHierarchyNode(child, level + 1)),
      ],
    );
  }

  Widget _buildOrganizationCard(OrganizationModel org, {int level = 0}) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        leading: level > 0
            ? Icon(Icons.subdirectory_arrow_right, color: Colors.grey[600])
            : _getTypeIcon(org.type),
        title: Text(
          org.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (org.code != null) Text('Código: ${org.code}'),
            Text(_formatType(org.type)),
            if (org.city != null || org.country != null)
              Text('${org.city ?? ''}, ${org.country ?? ''}'),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!org.isActive)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.red[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Inactivo',
                  style: TextStyle(color: Colors.red, fontSize: 12),
                ),
              ),
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') {
                  _showEditDialog(context, org);
                } else if (value == 'delete') {
                  _showDeleteDialog(context, org);
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(value: 'edit', child: Text('Editar')),
                const PopupMenuItem(value: 'delete', child: Text('Eliminar')),
              ],
            ),
          ],
        ),
        onTap: () {
          // TODO: Navigate to detail screen
        },
      ),
    );
  }

  Icon _getTypeIcon(String type) {
    switch (type) {
      case 'HEADQUARTERS':
        return const Icon(Icons.corporate_fare, color: Colors.blue);
      case 'BRANCH':
        return const Icon(Icons.account_balance, color: Colors.green);
      case 'OFFICE':
        return const Icon(Icons.business, color: Colors.orange);
      case 'STORE':
        return const Icon(Icons.store, color: Colors.purple);
      case 'WAREHOUSE':
        return const Icon(Icons.warehouse, color: Colors.brown);
      case 'FACTORY':
        return const Icon(Icons.factory, color: Colors.indigo);
      default:
        return const Icon(Icons.location_city, color: Colors.grey);
    }
  }

  String _formatType(String type) {
    const typeMap = {
      'HEADQUARTERS': 'Sede Central',
      'BRANCH': 'Sucursal',
      'OFFICE': 'Oficina',
      'STORE': 'Tienda',
      'WAREHOUSE': 'Almacén',
      'FACTORY': 'Fábrica',
      'DISTRIBUTION_CENTER': 'Centro de Distribución',
      'SALES_POINT': 'Punto de Venta',
      'SERVICE_CENTER': 'Centro de Servicio',
      'OTHER': 'Otro',
    };
    return typeMap[type] ?? type;
  }

  List<OrganizationModel> _filterOrganizations(
      List<OrganizationModel> organizations) {
    if (_searchController.text.isEmpty) {
      return organizations;
    }

    final query = _searchController.text.toLowerCase();
    return organizations.where((org) {
      return org.name.toLowerCase().contains(query) ||
          (org.code?.toLowerCase().contains(query) ?? false) ||
          (org.city?.toLowerCase().contains(query) ?? false);
    }).toList();
  }

  void _showCreateDialog(BuildContext context, String myCompanyId) {
    // TODO: Implement create organization form
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Formulario de creación en desarrollo')),
    );
  }

  void _showEditDialog(BuildContext context, OrganizationModel org) {
    // TODO: Implement edit organization form
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Formulario de edición en desarrollo')),
    );
  }

  void _showDeleteDialog(BuildContext context, OrganizationModel org) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar organización'),
        content: Text('¿Estás seguro de eliminar "${org.name}"?'),
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
                    .read(organizationsRepositoryProvider)
                    .deleteOrganization(org.id);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Organización eliminada')),
                  );
                }
                ref.invalidate(organizationsListProvider);
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
