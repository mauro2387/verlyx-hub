import 'package:flutter/material.dart';
import '../models/block_model.dart';

class BlockWidget extends StatelessWidget {
  final BlockModel block;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onDelete;
  final ValueChanged<BlockType> onTypeChange;

  const BlockWidget({
    Key? key,
    required this.block,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onDelete,
    required this.onTypeChange,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    switch (block.type) {
      case BlockType.paragraph:
        return _ParagraphBlock(
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.heading1:
        return _HeadingBlock(
          level: 1,
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.heading2:
        return _HeadingBlock(
          level: 2,
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.heading3:
        return _HeadingBlock(
          level: 3,
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.bulletedList:
        return _BulletedListBlock(
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.numberedList:
        return _NumberedListBlock(
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
          order: block.order,
        );
      case BlockType.todo:
        return _TodoBlock(
          content: block.content,
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.quote:
        return _QuoteBlock(
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.divider:
        return const _DividerBlock();
      case BlockType.callout:
        return _CalloutBlock(
          content: block.content,
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.code:
        return _CodeBlock(
          content: block.content,
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      case BlockType.toggle:
        return _ToggleBlock(
          content: block.content,
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
      default:
        return _ParagraphBlock(
          controller: controller,
          focusNode: focusNode,
          onChanged: onChanged,
        );
    }
  }
}

class _ParagraphBlock extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _ParagraphBlock({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      maxLines: null,
      style: Theme.of(context).textTheme.bodyLarge,
      decoration: const InputDecoration(
        hintText: 'Escribe algo...',
        border: InputBorder.none,
        contentPadding: EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      ),
      onChanged: onChanged,
    );
  }
}

class _HeadingBlock extends StatelessWidget {
  final int level;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _HeadingBlock({
    required this.level,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final textStyle = level == 1
        ? Theme.of(context).textTheme.headlineLarge
        : level == 2
            ? Theme.of(context).textTheme.headlineMedium
            : Theme.of(context).textTheme.headlineSmall;

    return TextField(
      controller: controller,
      focusNode: focusNode,
      maxLines: null,
      style: textStyle?.copyWith(fontWeight: FontWeight.bold),
      decoration: InputDecoration(
        hintText: 'Encabezado $level',
        border: InputBorder.none,
        contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
      ),
      onChanged: onChanged,
    );
  }
}

class _BulletedListBlock extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _BulletedListBlock({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 12, right: 8),
          child: Icon(Icons.circle, size: 8, color: Colors.grey.shade600),
        ),
        Expanded(
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            maxLines: null,
            style: Theme.of(context).textTheme.bodyLarge,
            decoration: const InputDecoration(
              hintText: 'Lista',
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 8),
            ),
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }
}

class _NumberedListBlock extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final int order;

  const _NumberedListBlock({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.order,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8, right: 8),
          child: Text(
            '${order + 1}.',
            style: TextStyle(
              color: Colors.grey.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            maxLines: null,
            style: Theme.of(context).textTheme.bodyLarge,
            decoration: const InputDecoration(
              hintText: 'Lista numerada',
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 8),
            ),
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }
}

class _TodoBlock extends StatefulWidget {
  final Map<String, dynamic> content;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _TodoBlock({
    required this.content,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  State<_TodoBlock> createState() => _TodoBlockState();
}

class _TodoBlockState extends State<_TodoBlock> {
  late bool _checked;

  @override
  void initState() {
    super.initState();
    _checked = widget.content['checked'] ?? false;
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 4, right: 8),
          child: Checkbox(
            value: _checked,
            onChanged: (value) {
              setState(() {
                _checked = value ?? false;
              });
              // TODO: Update block content with new checked state
            },
          ),
        ),
        Expanded(
          child: TextField(
            controller: widget.controller,
            focusNode: widget.focusNode,
            maxLines: null,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              decoration: _checked ? TextDecoration.lineThrough : null,
              color: _checked ? Colors.grey : null,
            ),
            decoration: const InputDecoration(
              hintText: 'Tarea',
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 8),
            ),
            onChanged: widget.onChanged,
          ),
        ),
      ],
    );
  }
}

class _QuoteBlock extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _QuoteBlock({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: Theme.of(context).colorScheme.primary,
            width: 4,
          ),
        ),
        color: Colors.grey.shade100,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        maxLines: null,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
          fontStyle: FontStyle.italic,
        ),
        decoration: const InputDecoration(
          hintText: 'Cita',
          border: InputBorder.none,
        ),
        onChanged: onChanged,
      ),
    );
  }
}

class _DividerBlock extends StatelessWidget {
  const _DividerBlock();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 16),
      child: Divider(thickness: 2),
    );
  }
}

class _CalloutBlock extends StatelessWidget {
  final Map<String, dynamic> content;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _CalloutBlock({
    required this.content,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final emoji = content['emoji'] ?? '💡';
    final color = Color(int.parse(content['color']?.replaceFirst('#', '0xFF') ?? '0xFFFFF3CD'));

    return Container(
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(emoji, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: controller,
              focusNode: focusNode,
              maxLines: null,
              style: Theme.of(context).textTheme.bodyLarge,
              decoration: const InputDecoration(
                hintText: 'Callout',
                border: InputBorder.none,
              ),
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class _CodeBlock extends StatelessWidget {
  final Map<String, dynamic> content;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _CodeBlock({
    required this.content,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final language = content['language'] ?? 'text';

    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade900,
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            language,
            style: TextStyle(
              color: Colors.grey.shade400,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            focusNode: focusNode,
            maxLines: null,
            style: const TextStyle(
              fontFamily: 'monospace',
              color: Colors.white,
            ),
            decoration: const InputDecoration(
              hintText: 'Código',
              hintStyle: TextStyle(color: Colors.grey),
              border: InputBorder.none,
            ),
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}

class _ToggleBlock extends StatefulWidget {
  final Map<String, dynamic> content;
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;

  const _ToggleBlock({
    required this.content,
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  @override
  State<_ToggleBlock> createState() => _ToggleBlockState();
}

class _ToggleBlockState extends State<_ToggleBlock> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconButton(
              icon: Icon(_isExpanded ? Icons.arrow_drop_down : Icons.arrow_right),
              onPressed: () {
                setState(() {
                  _isExpanded = !_isExpanded;
                });
              },
            ),
            Expanded(
              child: TextField(
                controller: widget.controller,
                focusNode: widget.focusNode,
                maxLines: null,
                style: Theme.of(context).textTheme.bodyLarge,
                decoration: const InputDecoration(
                  hintText: 'Toggle',
                  border: InputBorder.none,
                ),
                onChanged: widget.onChanged,
              ),
            ),
          ],
        ),
        if (_isExpanded)
          Padding(
            padding: const EdgeInsets.only(left: 48, top: 8),
            child: Text(
              widget.content['hiddenContent'] ?? 'Contenido oculto...',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
          ),
      ],
    );
  }
}
