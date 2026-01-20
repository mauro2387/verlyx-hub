import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/workspace_provider.dart';
import '../models/workspace_model.dart';
import '../models/page_model.dart';
import 'page_editor_screen.dart';

class WorkspacePagesScreen extends ConsumerStatefulWidget {
  final WorkspaceModel workspace;

  const WorkspacePagesScreen({
    Key? key,
    required this.workspace,
  }) : super(key: key);

  @override
  ConsumerState<WorkspacePagesScreen> createState() => _WorkspacePagesScreenState();
}

class _WorkspacePagesScreenState extends ConsumerState<WorkspacePagesScreen> {
  String? selectedParentPageId;

  @override
  void initState() {
    super.initState();
    print('🏢 WorkspacePagesScreen opened for workspace:');
    print('   ID: ${widget.workspace.id}');
    print('   Name: ${widget.workspace.name}');
    Future.microtask(() {
      ref.read(pagesProvider(widget.workspace.id).notifier).loadPages();
    });
  }

  @override
  Widget build(BuildContext context) {
    final pagesAsync = ref.watch(pagesProvider(widget.workspace.id));

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Text(widget.workspace.icon ?? '📝'),
            const SizedBox(width: 8),
            Text(widget.workspace.name),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreatePageDialog(null),
            tooltip: 'Nueva página raíz',
          ),
        ],
      ),
      body: pagesAsync.when(
        data: (pages) {
          if (pages.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.description_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'No hay páginas',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    icon: const Icon(Icons.add),
                    label: const Text('Crear primera página'),
                    onPressed: () => _showCreatePageDialog(null),
                  ),
                ],
              ),
            );
          }

          // Organizar páginas en árbol
          final rootPages = pages.where((p) => p.parentPageId == null).toList();
          final childPages = <String, List<PageModel>>{};
          for (var page in pages.where((p) => p.parentPageId != null)) {
            childPages.putIfAbsent(page.parentPageId!, () => []).add(page);
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: rootPages.map((page) {
              return _PageTreeItem(
                page: page,
                childPages: childPages,
                level: 0,
                onTap: () => _openPageEditor(page),
                onAddChild: () => _showCreatePageDialog(page.id),
                onEdit: () => _showEditPageDialog(page),
                onDelete: () => _confirmDeletePage(page),
                onDuplicate: () => _duplicatePage(page),
              );
            }).toList(),
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
                  ref.read(pagesProvider(widget.workspace.id).notifier).loadPages();
                },
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openPageEditor(PageModel page) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PageEditorScreen(page: page),
      ),
    );
  }

  void _showCreatePageDialog(String? parentPageId) {
    final titleController = TextEditingController();
    String selectedIcon = '📄';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(parentPageId == null ? 'Nueva Página' : 'Nueva Subpágina'),
        content: TextField(
          controller: titleController,
          decoration: const InputDecoration(
            labelText: 'Título',
            hintText: 'Sin título',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              final title = titleController.text.isEmpty ? 'Sin título' : titleController.text;
              print('📝 Creating page with workspaceId: ${widget.workspace.id}');
              
              final data = <String, dynamic>{
                'workspaceId': widget.workspace.id,
                'title': title,
                'icon': selectedIcon,
                'isPublic': false,
                'isTemplate': false,
                'canComment': true,
                'canEditByOthers': true,
              };
              
              if (parentPageId != null) {
                data['parentPageId'] = parentPageId;
              }
              
              print('📤 Page data: $data');
              ref.read(pagesProvider(widget.workspace.id).notifier).createPage(data);
              Navigator.pop(context);
            },
            child: const Text('Crear'),
          ),
        ],
      ),
    );
  }

  void _showEditPageDialog(PageModel page) {
    final titleController = TextEditingController(text: page.title);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar Página'),
        content: TextField(
          controller: titleController,
          decoration: const InputDecoration(labelText: 'Título'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(pagesProvider(widget.workspace.id).notifier).updatePage(
                page.id,
                {'title': titleController.text},
              );
              Navigator.pop(context);
            },
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  void _confirmDeletePage(PageModel page) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Página'),
        content: Text('¿Eliminar "${page.title}" y todas sus subpáginas?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              ref.read(pagesProvider(widget.workspace.id).notifier).deletePage(page.id);
              Navigator.pop(context);
            },
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }

  void _duplicatePage(PageModel page) {
    ref.read(pagesProvider(widget.workspace.id).notifier).duplicatePage(page.id);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Página "${page.title}" duplicada')),
    );
  }
}

class _PageTreeItem extends StatefulWidget {
  final PageModel page;
  final Map<String, List<PageModel>> childPages;
  final int level;
  final VoidCallback onTap;
  final VoidCallback onAddChild;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onDuplicate;

  const _PageTreeItem({
    required this.page,
    required this.childPages,
    required this.level,
    required this.onTap,
    required this.onAddChild,
    required this.onEdit,
    required this.onDelete,
    required this.onDuplicate,
  });

  @override
  State<_PageTreeItem> createState() => _PageTreeItemState();
}

class _PageTreeItemState extends State<_PageTreeItem> {
  bool _isExpanded = true;

  @override
  Widget build(BuildContext context) {
    final hasChildren = widget.childPages[widget.page.id]?.isNotEmpty ?? false;
    final children = widget.childPages[widget.page.id] ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.only(left: widget.level * 24.0),
          child: Card(
            margin: const EdgeInsets.symmetric(vertical: 4),
            child: ListTile(
              dense: true,
              leading: hasChildren
                  ? IconButton(
                      icon: Icon(
                        _isExpanded ? Icons.expand_more : Icons.chevron_right,
                        size: 20,
                      ),
                      onPressed: () {
                        setState(() {
                          _isExpanded = !_isExpanded;
                        });
                      },
                    )
                  : const SizedBox(width: 40),
              title: Row(
                children: [
                  Text(widget.page.icon ?? '📄', style: const TextStyle(fontSize: 20)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      widget.page.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              trailing: PopupMenuButton(
                icon: const Icon(Icons.more_vert, size: 20),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    child: const Row(
                      children: [
                        Icon(Icons.edit, size: 18),
                        SizedBox(width: 8),
                        Text('Editar'),
                      ],
                    ),
                    onTap: widget.onEdit,
                  ),
                  PopupMenuItem(
                    child: const Row(
                      children: [
                        Icon(Icons.add, size: 18),
                        SizedBox(width: 8),
                        Text('Añadir subpágina'),
                      ],
                    ),
                    onTap: widget.onAddChild,
                  ),
                  PopupMenuItem(
                    child: const Row(
                      children: [
                        Icon(Icons.copy, size: 18),
                        SizedBox(width: 8),
                        Text('Duplicar'),
                      ],
                    ),
                    onTap: widget.onDuplicate,
                  ),
                  PopupMenuItem(
                    child: const Row(
                      children: [
                        Icon(Icons.delete, size: 18, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Eliminar', style: TextStyle(color: Colors.red)),
                      ],
                    ),
                    onTap: widget.onDelete,
                  ),
                ],
              ),
              onTap: widget.onTap,
            ),
          ),
        ),
        if (_isExpanded && hasChildren)
          ...children.map((child) {
            return _PageTreeItem(
              page: child,
              childPages: widget.childPages,
              level: widget.level + 1,
              onTap: widget.onTap,
              onAddChild: widget.onAddChild,
              onEdit: widget.onEdit,
              onDelete: widget.onDelete,
              onDuplicate: widget.onDuplicate,
            );
          }),
      ],
    );
  }
}
