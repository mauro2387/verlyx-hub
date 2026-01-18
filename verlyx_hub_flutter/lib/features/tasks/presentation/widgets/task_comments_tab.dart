import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/network/dio_provider.dart';
import '../../data/models/task_comment_model.dart';
import '../../data/repositories/task_comments_repository.dart';

final taskCommentsRepositoryProvider = Provider<TaskCommentsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return TaskCommentsRepository(dio);
});

class TaskCommentsTab extends ConsumerStatefulWidget {
  final String taskId;

  const TaskCommentsTab({
    Key? key,
    required this.taskId,
  }) : super(key: key);

  @override
  ConsumerState<TaskCommentsTab> createState() => _TaskCommentsTabState();
}

class _TaskCommentsTabState extends ConsumerState<TaskCommentsTab> {
  final _commentController = TextEditingController();
  List<TaskCommentModel> _comments = [];
  bool _isLoading = false;
  String? _replyingToId;
  String? _editingCommentId;

  @override
  void initState() {
    super.initState();
    _loadComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    setState(() => _isLoading = true);
    try {
      final repository = ref.read(taskCommentsRepositoryProvider);
      final comments = await repository.getComments(widget.taskId);
      setState(() {
        _comments = comments;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _submitComment() async {
    if (_commentController.text.trim().isEmpty) return;

    try {
      final repository = ref.read(taskCommentsRepositoryProvider);
      final comment = TaskCommentModel(
        id: _editingCommentId ?? '',
        taskId: widget.taskId,
        parentCommentId: _replyingToId,
        content: _commentController.text.trim(),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      if (_editingCommentId != null) {
        await repository.updateComment(_editingCommentId!, comment);
        setState(() => _editingCommentId = null);
      } else {
        await repository.createComment(comment);
      }

      _commentController.clear();
      setState(() => _replyingToId = null);
      _loadComments();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_editingCommentId != null ? '✅ Comentario editado' : '✅ Comentario creado'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _deleteComment(String commentId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar comentario'),
        content: const Text('¿Estás seguro de eliminar este comentario?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final repository = ref.read(taskCommentsRepositoryProvider);
      await repository.deleteComment(commentId);
      _loadComments();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Comentario eliminado'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _toggleReaction(String commentId, String emoji) async {
    try {
      final repository = ref.read(taskCommentsRepositoryProvider);
      // TODO: Check if user already reacted
      await repository.addReaction(commentId, emoji);
      _loadComments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showEmojiPicker(String commentId) {
    final emojis = ['👍', '❤️', '😄', '🎉', '🚀', '👀'];
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reaccionar'),
        content: Wrap(
          spacing: 8,
          children: emojis.map((emoji) {
            return InkWell(
              onTap: () {
                Navigator.pop(context);
                _toggleReaction(commentId, emoji);
              },
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(emoji, style: const TextStyle(fontSize: 32)),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCommentItem(TaskCommentModel comment, {bool isReply = false}) {
    final isTopLevel = comment.parentCommentId == null;

    return Container(
      margin: EdgeInsets.only(
        left: isReply ? 40 : 0,
        bottom: 12,
      ),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: Colors.blue,
                    child: const Icon(Icons.person, size: 16, color: Colors.white),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          comment.createdBy ?? 'Usuario',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          DateFormat('dd/MM/yyyy HH:mm').format(comment.createdAt),
                          style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  if (comment.isEdited)
                    Chip(
                      label: const Text('Editado', style: TextStyle(fontSize: 10)),
                      backgroundColor: Colors.grey[200],
                      padding: EdgeInsets.zero,
                      labelPadding: const EdgeInsets.symmetric(horizontal: 6),
                    ),
                  PopupMenuButton(
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'edit', child: Text('Editar')),
                      const PopupMenuItem(value: 'delete', child: Text('Eliminar')),
                    ],
                    onSelected: (value) {
                      if (value == 'edit') {
                        setState(() {
                          _editingCommentId = comment.id;
                          _commentController.text = comment.content;
                        });
                      } else if (value == 'delete') {
                        _deleteComment(comment.id);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Content
              Text(comment.content),

              // Reactions
              if (comment.reactions != null && comment.reactions!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 4,
                  children: comment.reactions!.entries.map((entry) {
                    final emoji = entry.key;
                    final users = entry.value as List;
                    return Chip(
                      label: Text('$emoji ${users.length}'),
                      backgroundColor: Colors.blue[50],
                      labelStyle: const TextStyle(fontSize: 12),
                      padding: EdgeInsets.zero,
                      labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                      onDeleted: () => _toggleReaction(comment.id, emoji),
                      deleteIcon: const Icon(Icons.close, size: 14),
                    );
                  }).toList(),
                ),
              ],

              // Actions
              const SizedBox(height: 8),
              Row(
                children: [
                  if (isTopLevel)
                    TextButton.icon(
                      onPressed: () {
                        setState(() => _replyingToId = comment.id);
                        FocusScope.of(context).requestFocus(FocusNode());
                      },
                      icon: const Icon(Icons.reply, size: 16),
                      label: const Text('Responder'),
                      style: TextButton.styleFrom(padding: EdgeInsets.zero),
                    ),
                  const SizedBox(width: 12),
                  TextButton.icon(
                    onPressed: () => _showEmojiPicker(comment.id),
                    icon: const Icon(Icons.emoji_emotions, size: 16),
                    label: const Text('Reaccionar'),
                    style: TextButton.styleFrom(padding: EdgeInsets.zero),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final topLevelComments = _comments.where((c) => c.parentCommentId == null).toList();

    return Column(
      children: [
        // Comments list
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _comments.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.comment, size: 80, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text('Sin comentarios', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          const SizedBox(height: 8),
                          const Text('Sé el primero en comentar'),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: topLevelComments.length,
                      itemBuilder: (context, index) {
                        final comment = topLevelComments[index];
                        final replies = _comments.where((c) => c.parentCommentId == comment.id).toList();
                        
                        return Column(
                          children: [
                            _buildCommentItem(comment),
                            ...replies.map((reply) => _buildCommentItem(reply, isReply: true)),
                          ],
                        );
                      },
                    ),
        ),

        // Input area
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.grey.withOpacity(0.2),
                blurRadius: 4,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_replyingToId != null)
                Container(
                  padding: const EdgeInsets.all(8),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.reply, size: 16, color: Colors.blue),
                      const SizedBox(width: 8),
                      const Expanded(child: Text('Respondiendo...')),
                      IconButton(
                        icon: const Icon(Icons.close, size: 16),
                        onPressed: () => setState(() => _replyingToId = null),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
              if (_editingCommentId != null)
                Container(
                  padding: const EdgeInsets.all(8),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: Colors.orange[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.edit, size: 16, color: Colors.orange),
                      const SizedBox(width: 8),
                      const Expanded(child: Text('Editando...')),
                      IconButton(
                        icon: const Icon(Icons.close, size: 16),
                        onPressed: () {
                          setState(() => _editingCommentId = null);
                          _commentController.clear();
                        },
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: const InputDecoration(
                        hintText: 'Escribe un comentario...',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      maxLines: null,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _submitComment(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _submitComment,
                    icon: const Icon(Icons.send),
                    color: Colors.blue,
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.blue[50],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
