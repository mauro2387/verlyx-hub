import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/providers/workspace_provider.dart';
import '../../data/models/page_model.dart';
import '../../data/models/block_model.dart';
import '../widgets/block_widget.dart';
import '../widgets/block_type_picker.dart';

class PageEditorScreen extends ConsumerStatefulWidget {
  final PageModel page;

  const PageEditorScreen({
    Key? key,
    required this.page,
  }) : super(key: key);

  @override
  ConsumerState<PageEditorScreen> createState() => _PageEditorScreenState();
}

class _PageEditorScreenState extends ConsumerState<PageEditorScreen> {
  final ScrollController _scrollController = ScrollController();
  final FocusNode _titleFocusNode = FocusNode();
  late TextEditingController _titleController;
  String? _focusedBlockId;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.page.title);
    
    Future.microtask(() {
      ref.read(currentPageProvider(widget.page.id).notifier).loadPage();
      ref.read(blocksProvider(widget.page.id).notifier).loadBlocks();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _titleFocusNode.dispose();
    _titleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pageAsync = ref.watch(currentPageProvider(widget.page.id));
    final blocksAsync = ref.watch(blocksProvider(widget.page.id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Editor'),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert),
            onPressed: () => _showPageMenu(),
          ),
        ],
      ),
      body: pageAsync.when(
        data: (page) {
          if (page == null) return const Center(child: Text('Página no encontrada'));

          return Column(
            children: [
              // Page Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
                  border: Border(
                    bottom: BorderSide(
                      color: Theme.of(context).dividerColor,
                      width: 1,
                    ),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Icon & Title
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () => _showIconPicker(page),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              page.icon ?? '📄',
                              style: const TextStyle(fontSize: 32),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _titleController,
                            focusNode: _titleFocusNode,
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            decoration: const InputDecoration(
                              hintText: 'Sin título',
                              border: InputBorder.none,
                            ),
                            onChanged: (value) {
                              // Debounce update
                              Future.delayed(const Duration(milliseconds: 500), () {
                                if (value == _titleController.text) {
                                  _updatePageTitle(value);
                                }
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Metadata
                    Text(
                      'Editado ${_formatDate(page.updatedAt ?? page.createdAt)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
              // Blocks Content
              Expanded(
                child: blocksAsync.when(
                  data: (blocks) {
                    return ListView(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16),
                      children: [
                        ...blocks.map((block) {
                          return _BlockItem(
                            key: ValueKey(block.id),
                            block: block,
                            isFocused: _focusedBlockId == block.id,
                            onFocusChanged: (focused) {
                              setState(() {
                                _focusedBlockId = focused ? block.id : null;
                              });
                            },
                            onUpdate: (content) => _updateBlock(block.id, content),
                            onDelete: () => _deleteBlock(block.id),
                            onTypeChange: (newType) => _changeBlockType(block.id, newType),
                            onEnterPressed: () => _createBlockAfter(block),
                            onBackspaceEmpty: () => _deleteBlock(block.id),
                          );
                        }),
                        const SizedBox(height: 16),
                        // Add block button
                        _AddBlockButton(
                          onPressed: () => _createNewBlock(blocks.length),
                        ),
                        const SizedBox(height: 200), // Bottom padding for easier scrolling
                      ],
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, stack) => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 16),
                        Text('Error: $error'),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () {
                            ref.read(blocksProvider(widget.page.id).notifier).loadBlocks();
                          },
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showBlockTypePicker(),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _updatePageTitle(String title) {
    ref.read(currentPageProvider(widget.page.id).notifier);
    // Update via API
    final pagesNotifier = ref.read(pagesProvider(widget.page.workspaceId).notifier);
    pagesNotifier.updatePage(widget.page.id, {'title': title});
  }

  void _createNewBlock(int order) {
    ref.read(blocksProvider(widget.page.id).notifier).createBlock({
      'pageId': widget.page.id,
      'type': BlockType.paragraph.name,
      'content': {'text': ''},
      'order': order,
      'indentLevel': 0,
    });
  }

  void _createBlockAfter(BlockModel block) {
    ref.read(blocksProvider(widget.page.id).notifier).createBlock({
      'pageId': widget.page.id,
      'type': BlockType.paragraph.name,
      'content': {'text': ''},
      'order': block.order + 1,
      'indentLevel': block.indentLevel,
    });
  }

  void _updateBlock(String blockId, Map<String, dynamic> content) {
    ref.read(blocksProvider(widget.page.id).notifier).updateBlock(blockId, {
      'content': content,
    });
  }

  void _deleteBlock(String blockId) {
    ref.read(blocksProvider(widget.page.id).notifier).deleteBlock(blockId);
  }

  void _changeBlockType(String blockId, BlockType newType) {
    ref.read(blocksProvider(widget.page.id).notifier).updateBlock(blockId, {
      'type': newType.name,
    });
  }

  void _showIconPicker(PageModel page) {
    final icons = ['📄', '📝', '📋', '📊', '📈', '📚', '🔥', '💡', '🎯', '⚡', '🚀', '✨'];
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Elegir icono'),
        content: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: icons.map((icon) {
            return InkWell(
              onTap: () {
                final pagesNotifier = ref.read(pagesProvider(page.workspaceId).notifier);
                pagesNotifier.updatePage(page.id, {'icon': icon});
                Navigator.pop(context);
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(icon, style: const TextStyle(fontSize: 32)),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showPageMenu() {
    showModalBottomSheet(
      context: context,
      builder: (context) => ListView(
        shrinkWrap: true,
        children: [
          ListTile(
            leading: const Icon(Icons.copy),
            title: const Text('Duplicar página'),
            onTap: () {
              Navigator.pop(context);
              ref.read(pagesProvider(widget.page.workspaceId).notifier)
                  .duplicatePage(widget.page.id);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Página duplicada')),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete, color: Colors.red),
            title: const Text('Eliminar página', style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.pop(context);
              _confirmDeletePage();
            },
          ),
        ],
      ),
    );
  }

  void _confirmDeletePage() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar página'),
        content: const Text('¿Estás seguro de eliminar esta página?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              ref.read(pagesProvider(widget.page.workspaceId).notifier)
                  .deletePage(widget.page.id);
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Close editor
            },
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  void _showBlockTypePicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => BlockTypePicker(
        onTypeSelected: (type) {
          Navigator.pop(context);
          final blocksAsync = ref.read(blocksProvider(widget.page.id));
          blocksAsync.whenData((blocks) {
            _createNewBlock(blocks.length);
          });
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inMinutes < 1) return 'ahora';
    if (diff.inMinutes < 60) return 'hace ${diff.inMinutes}m';
    if (diff.inHours < 24) return 'hace ${diff.inHours}h';
    if (diff.inDays < 7) return 'hace ${diff.inDays}d';
    
    return '${date.day}/${date.month}/${date.year}';
  }
}

class _BlockItem extends StatefulWidget {
  final BlockModel block;
  final bool isFocused;
  final ValueChanged<bool> onFocusChanged;
  final ValueChanged<Map<String, dynamic>> onUpdate;
  final VoidCallback onDelete;
  final ValueChanged<BlockType> onTypeChange;
  final VoidCallback onEnterPressed;
  final VoidCallback onBackspaceEmpty;

  const _BlockItem({
    Key? key,
    required this.block,
    required this.isFocused,
    required this.onFocusChanged,
    required this.onUpdate,
    required this.onDelete,
    required this.onTypeChange,
    required this.onEnterPressed,
    required this.onBackspaceEmpty,
  }) : super(key: key);

  @override
  State<_BlockItem> createState() => _BlockItemState();
}

class _BlockItemState extends State<_BlockItem> {
  late TextEditingController _controller;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.block.content['text'] ?? '');
    _focusNode.addListener(() {
      widget.onFocusChanged(_focusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: widget.block.indentLevel * 24.0,
        bottom: 8,
      ),
      child: Focus(
        onKey: (node, event) {
          // Handle keyboard shortcuts
          return KeyEventResult.ignored;
        },
        child: BlockWidget(
          block: widget.block,
          controller: _controller,
          focusNode: _focusNode,
          onChanged: (text) {
            // Debounce update
            Future.delayed(const Duration(milliseconds: 300), () {
              if (text == _controller.text) {
                widget.onUpdate({'text': text});
              }
            });
          },
          onDelete: widget.onDelete,
          onTypeChange: widget.onTypeChange,
        ),
      ),
    );
  }
}

class _AddBlockButton extends StatelessWidget {
  final VoidCallback onPressed;

  const _AddBlockButton({required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(Icons.add, size: 20, color: Colors.grey.shade600),
            const SizedBox(width: 8),
            Text(
              'Añadir bloque',
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}
