import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/models/conversation_model.dart';
import '../../data/repositories/ai_repository.dart';
import '../../../../core/network/dio_provider.dart';
import '../../../../core/presentation/bottom_nav_bar.dart';
import 'ai_chat_screen.dart';

final aiRepositoryProvider = Provider((ref) {
  final dio = ref.watch(dioProvider);
  return AiRepository(dio);
});

final conversationsProvider = FutureProvider<List<ConversationModel>>((ref) async {
  final repository = ref.watch(aiRepositoryProvider);
  return await repository.getConversations();
});

class ConversationsListScreen extends ConsumerStatefulWidget {
  const ConversationsListScreen({super.key});

  @override
  ConsumerState<ConversationsListScreen> createState() => _ConversationsListScreenState();
}

class _ConversationsListScreenState extends ConsumerState<ConversationsListScreen> {
  String _selectedFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final conversationsAsync = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Conversaciones IA'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() {
                _selectedFilter = value;
              });
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('Todas')),
              const PopupMenuItem(value: 'general', child: Text('General')),
              const PopupMenuItem(value: 'project', child: Text('Proyectos')),
              const PopupMenuItem(value: 'task', child: Text('Tareas')),
              const PopupMenuItem(value: 'pinned', child: Text('Fijadas')),
            ],
          ),
        ],
      ),
      body: conversationsAsync.when(
        data: (conversations) {
          final filtered = _filterConversations(conversations);
          
          if (filtered.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.chat_bubble_outline, size: 80, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No hay conversaciones',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Toca + para crear una nueva',
                    style: TextStyle(color: Colors.grey[500]),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(conversationsProvider);
            },
            child: ListView.builder(
              itemCount: filtered.length,
              itemBuilder: (context, index) {
                final conversation = filtered[index];
                return _ConversationTile(
                  conversation: conversation,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => AiChatScreen(conversationId: conversation.id),
                      ),
                    ).then((_) => ref.invalidate(conversationsProvider));
                  },
                  onDelete: () async {
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Eliminar conversación'),
                        content: const Text('¿Estás seguro? Esta acción no se puede deshacer.'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Cancelar'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(context, true),
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.red,
                            ),
                            child: const Text('Eliminar'),
                          ),
                        ],
                      ),
                    );

                    if (confirm == true) {
                      try {
                        await ref.read(aiRepositoryProvider).deleteConversation(conversation.id);
                        ref.invalidate(conversationsProvider);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Conversación eliminada')),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Error: $e')),
                          );
                        }
                      }
                    }
                  },
                  onPin: () async {
                    try {
                      await ref.read(aiRepositoryProvider).updateConversation(
                        conversation.id,
                        isPinned: !conversation.isPinned,
                      );
                      ref.invalidate(conversationsProvider);
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Error: $e')),
                        );
                      }
                    }
                  },
                  onRename: () async {
                    final controller = TextEditingController(text: conversation.title);
                    final newTitle = await showDialog<String>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Renombrar conversación'),
                        content: TextField(
                          controller: controller,
                          decoration: const InputDecoration(
                            labelText: 'Nuevo título',
                            border: OutlineInputBorder(),
                          ),
                          autofocus: true,
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancelar'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(context, controller.text),
                            child: const Text('Guardar'),
                          ),
                        ],
                      ),
                    );

                    if (newTitle != null && newTitle.isNotEmpty) {
                      try {
                        await ref.read(aiRepositoryProvider).updateConversation(
                          conversation.id,
                          title: newTitle,
                        );
                        ref.invalidate(conversationsProvider);
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Error: $e')),
                          );
                        }
                      }
                    }
                  },
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 60, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error: $error'),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => ref.invalidate(conversationsProvider),
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: buildBottomNavBar(context, 3),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Nueva conversación'),
      ),
    );
  }

  List<ConversationModel> _filterConversations(List<ConversationModel> conversations) {
    if (_selectedFilter == 'all') return conversations;
    if (_selectedFilter == 'pinned') {
      return conversations.where((c) => c.isPinned).toList();
    }
    return conversations.where((c) => c.contextType == _selectedFilter).toList();
  }

  Future<void> _showCreateDialog(BuildContext context) async {
    final titleController = TextEditingController();
    String selectedType = 'general';

    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Nueva conversación'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Título',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedType,
                decoration: const InputDecoration(
                  labelText: 'Tipo',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'general', child: Text('General')),
                  DropdownMenuItem(value: 'project', child: Text('Proyecto')),
                  DropdownMenuItem(value: 'task', child: Text('Tarea')),
                  DropdownMenuItem(value: 'pdf', child: Text('PDF')),
                ],
                onChanged: (value) {
                  setState(() {
                    selectedType = value!;
                  });
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () {
                if (titleController.text.isNotEmpty) {
                  Navigator.pop(context, {
                    'title': titleController.text,
                    'type': selectedType,
                  });
                }
              },
              child: const Text('Crear'),
            ),
          ],
        ),
      ),
    );

    if (result != null) {
      try {
        final conversation = await ref.read(aiRepositoryProvider).createConversation(
          title: result['title']!,
          contextType: result['type']!,
        );
        
        ref.invalidate(conversationsProvider);
        
        if (context.mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AiChatScreen(conversationId: conversation.id),
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    }
  }
}

class _ConversationTile extends StatelessWidget {
  final ConversationModel conversation;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final VoidCallback onPin;
  final VoidCallback onRename;

  const _ConversationTile({
    required this.conversation,
    required this.onTap,
    required this.onDelete,
    required this.onPin,
    required this.onRename,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getContextColor(conversation.contextType),
          child: Icon(_getContextIcon(conversation.contextType), color: Colors.white),
        ),
        title: Row(
          children: [
            if (conversation.isPinned)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.push_pin, size: 16, color: Colors.orange),
              ),
            Expanded(
              child: Text(
                conversation.title,
                style: const TextStyle(fontWeight: FontWeight.bold),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        subtitle: Text(_formatDate(conversation.updatedAt)),
        trailing: PopupMenuButton(
          itemBuilder: (context) => [
            PopupMenuItem(
              onTap: onRename,
              child: const Row(
                children: [
                  Icon(Icons.edit),
                  SizedBox(width: 8),
                  Text('Renombrar'),
                ],
              ),
            ),
            PopupMenuItem(
              onTap: onPin,
              child: Row(
                children: [
                  Icon(conversation.isPinned ? Icons.push_pin_outlined : Icons.push_pin),
                  const SizedBox(width: 8),
                  Text(conversation.isPinned ? 'Desfijar' : 'Fijar'),
                ],
              ),
            ),
            PopupMenuItem(
              onTap: onDelete,
              child: const Row(
                children: [
                  Icon(Icons.delete, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Eliminar', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }

  Color _getContextColor(String type) {
    switch (type) {
      case 'project':
        return Colors.purple;
      case 'task':
        return Colors.orange;
      case 'pdf':
        return Colors.red;
      default:
        return Colors.blue;
    }
  }

  IconData _getContextIcon(String type) {
    switch (type) {
      case 'project':
        return Icons.folder;
      case 'task':
        return Icons.task;
      case 'pdf':
        return Icons.picture_as_pdf;
      default:
        return Icons.chat;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'Ahora';
    if (diff.inHours < 1) return '${diff.inMinutes}m';
    if (diff.inDays < 1) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    
    return DateFormat('dd/MM/yy').format(date);
  }
}
