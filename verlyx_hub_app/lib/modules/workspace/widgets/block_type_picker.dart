import 'package:flutter/material.dart';
import '../models/block_model.dart';

class BlockTypePicker extends StatelessWidget {
  final ValueChanged<BlockType> onTypeSelected;

  const BlockTypePicker({
    Key? key,
    required this.onTypeSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final blockTypes = [
      _BlockTypeItem(
        icon: Icons.text_fields,
        title: 'Texto',
        subtitle: 'Párrafo normal',
        type: BlockType.paragraph,
      ),
      _BlockTypeItem(
        icon: Icons.title,
        title: 'Encabezado 1',
        subtitle: 'Título grande',
        type: BlockType.heading1,
      ),
      _BlockTypeItem(
        icon: Icons.title,
        title: 'Encabezado 2',
        subtitle: 'Título mediano',
        type: BlockType.heading2,
      ),
      _BlockTypeItem(
        icon: Icons.title,
        title: 'Encabezado 3',
        subtitle: 'Título pequeño',
        type: BlockType.heading3,
      ),
      _BlockTypeItem(
        icon: Icons.list,
        title: 'Lista con viñetas',
        subtitle: 'Lista simple',
        type: BlockType.bulletedList,
      ),
      _BlockTypeItem(
        icon: Icons.format_list_numbered,
        title: 'Lista numerada',
        subtitle: 'Lista con números',
        type: BlockType.numberedList,
      ),
      _BlockTypeItem(
        icon: Icons.check_box,
        title: 'Lista de tareas',
        subtitle: 'Checklist',
        type: BlockType.todo,
      ),
      _BlockTypeItem(
        icon: Icons.arrow_right,
        title: 'Toggle',
        subtitle: 'Contenido desplegable',
        type: BlockType.toggle,
      ),
      _BlockTypeItem(
        icon: Icons.format_quote,
        title: 'Cita',
        subtitle: 'Texto citado',
        type: BlockType.quote,
      ),
      _BlockTypeItem(
        icon: Icons.horizontal_rule,
        title: 'Divisor',
        subtitle: 'Línea separadora',
        type: BlockType.divider,
      ),
      _BlockTypeItem(
        icon: Icons.lightbulb_outline,
        title: 'Callout',
        subtitle: 'Cuadro destacado',
        type: BlockType.callout,
      ),
      _BlockTypeItem(
        icon: Icons.code,
        title: 'Código',
        subtitle: 'Bloque de código',
        type: BlockType.code,
      ),
      _BlockTypeItem(
        icon: Icons.image,
        title: 'Imagen',
        subtitle: 'Subir o incrustar',
        type: BlockType.image,
      ),
      _BlockTypeItem(
        icon: Icons.video_library,
        title: 'Video',
        subtitle: 'Incrustar video',
        type: BlockType.video,
      ),
      _BlockTypeItem(
        icon: Icons.attach_file,
        title: 'Archivo',
        subtitle: 'Subir archivo',
        type: BlockType.file,
      ),
      _BlockTypeItem(
        icon: Icons.link,
        title: 'Embed',
        subtitle: 'Incrustar contenido',
        type: BlockType.embed,
      ),
      _BlockTypeItem(
        icon: Icons.table_chart,
        title: 'Tabla',
        subtitle: 'Crear tabla',
        type: BlockType.table,
      ),
      _BlockTypeItem(
        icon: Icons.bookmark,
        title: 'Marcador',
        subtitle: 'Link con vista previa',
        type: BlockType.bookmark,
      ),
      _BlockTypeItem(
        icon: Icons.insert_link,
        title: 'Link a página',
        subtitle: 'Referencia interna',
        type: BlockType.linkToPage,
      ),
    ];

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    Text(
                      'Tipos de bloque',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // List
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: blockTypes.length,
                  itemBuilder: (context, index) {
                    final item = blockTypes[index];
                    return ListTile(
                      leading: Icon(item.icon),
                      title: Text(item.title),
                      subtitle: Text(item.subtitle),
                      onTap: () => onTypeSelected(item.type),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _BlockTypeItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final BlockType type;

  _BlockTypeItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.type,
  });
}
