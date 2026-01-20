import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_provider.dart';
import '../../data/models/conversation_model.dart';
import '../../data/models/message_model.dart';
import '../../data/repositories/ai_repository.dart';

final aiRepositoryProvider = Provider<AiRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return AiRepository(dio);
});

final conversationProvider = FutureProvider.family<ConversationModel, String>((ref, id) async {
  final repository = ref.watch(aiRepositoryProvider);
  return await repository.getConversation(id);
});

final messagesProvider = FutureProvider.family<List<MessageModel>, String>((ref, conversationId) async {
  final repository = ref.watch(aiRepositoryProvider);
  return await repository.getMessages(conversationId);
});

class AiChatScreen extends ConsumerStatefulWidget {
  final String conversationId;

  const AiChatScreen({
    super.key,
    required this.conversationId,
  });

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty) return;

    _messageController.clear();
    setState(() => _isLoading = true);

    try {
      final repository = ref.read(aiRepositoryProvider);
      await repository.sendMessage(widget.conversationId, message);
      
      ref.invalidate(messagesProvider(widget.conversationId));
      
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _showRenameDialog(String currentTitle) async {
    final controller = TextEditingController(text: currentTitle);
    
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
          widget.conversationId,
          title: newTitle,
        );
        ref.invalidate(conversationProvider(widget.conversationId));
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e')),
          );
        }
      }
    }
  }

  Future<void> _togglePin(bool currentlyPinned) async {
    try {
      await ref.read(aiRepositoryProvider).updateConversation(
        widget.conversationId,
        isPinned: !currentlyPinned,
      );
      ref.invalidate(conversationProvider(widget.conversationId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final conversationAsync = ref.watch(conversationProvider(widget.conversationId));
    final messagesAsync = ref.watch(messagesProvider(widget.conversationId));

    return Scaffold(
      appBar: AppBar(
        title: conversationAsync.when(
          data: (conv) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (conv.isPinned)
                    const Padding(
                      padding: EdgeInsets.only(right: 6),
                      child: Icon(Icons.push_pin, size: 14),
                    ),
                  Expanded(
                    child: Text(
                      conv.title,
                      style: const TextStyle(fontSize: 16),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              Text(
                _getContextLabel(conv.contextType),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
              ),
            ],
          ),
          loading: () => const Text('Cargando...'),
          error: (_, __) => const Text('Error'),
        ),
        actions: [
          conversationAsync.when(
            data: (conv) => PopupMenuButton(
              itemBuilder: (context) => [
                PopupMenuItem(
                  onTap: () => _showRenameDialog(conv.title),
                  child: const Row(
                    children: [
                      Icon(Icons.edit),
                      SizedBox(width: 8),
                      Text('Renombrar'),
                    ],
                  ),
                ),
                PopupMenuItem(
                  onTap: () => _togglePin(conv.isPinned),
                  child: Row(
                    children: [
                      Icon(conv.isPinned ? Icons.push_pin_outlined : Icons.push_pin),
                      const SizedBox(width: 8),
                      Text(conv.isPinned ? 'Desfijar' : 'Fijar'),
                    ],
                  ),
                ),
              ],
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: Column(
        children: [
          conversationAsync.when(
            data: (conv) => Container(
              padding: const EdgeInsets.all(12),
              color: _getContextColor(conv.contextType).withOpacity(0.1),
              child: Row(
                children: [
                  Icon(
                    _getContextIcon(conv.contextType),
                    color: _getContextColor(conv.contextType),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _getContextDescription(conv.contextType),
                      style: TextStyle(
                        color: _getContextColor(conv.contextType),
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),

          Expanded(
            child: messagesAsync.when(
              data: (messages) {
                if (messages.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.chat_bubble_outline,
                          size: 80,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '¡Hola! ¿En qué puedo ayudarte?',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey.shade600,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Escribe tu primer mensaje',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(messagesProvider(widget.conversationId));
                  },
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final message = messages[index];
                      return _buildMessageBubble(message);
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
                      onPressed: () {
                        ref.invalidate(messagesProvider(widget.conversationId));
                      },
                      icon: const Icon(Icons.refresh),
                      label: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            ),
          ),

          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Pensando...',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 14,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
            ),

          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    maxLines: null,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: 'Escribe tu mensaje...',
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: Theme.of(context).primaryColor,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 20),
                    onPressed: _isLoading ? null : _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(MessageModel message) {
    final isUser = message.role == 'user';
    
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isUser
              ? Theme.of(context).primaryColor
              : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(20).copyWith(
            bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(20),
            bottomLeft: isUser ? const Radius.circular(20) : const Radius.circular(4),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.content,
              style: TextStyle(
                color: isUser ? Colors.white : Colors.black87,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(message.createdAt),
              style: TextStyle(
                color: isUser
                    ? Colors.white.withOpacity(0.7)
                    : Colors.grey.shade600,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inMinutes < 1) {
      return 'Ahora';
    } else if (difference.inHours < 1) {
      return 'Hace ${difference.inMinutes}m';
    } else if (difference.inDays < 1) {
      return 'Hace ${difference.inHours}h';
    } else {
      return '${time.day}/${time.month}/${time.year}';
    }
  }

  String _getContextLabel(String type) {
    switch (type) {
      case 'project':
        return 'Conversación de proyecto';
      case 'task':
        return 'Conversación de tarea';
      case 'pdf':
        return 'Análisis de PDF';
      default:
        return 'Conversación general';
    }
  }

  String _getContextDescription(String type) {
    switch (type) {
      case 'project':
        return 'Enfocado en ayudarte con este proyecto específico';
      case 'task':
        return 'Ayudándote a completar esta tarea';
      case 'pdf':
        return 'Analizando y respondiendo sobre documentos';
      default:
        return 'Pregúntame sobre proyectos, tareas, PDFs o cualquier duda';
    }
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
        return Icons.auto_awesome;
    }
  }
}
