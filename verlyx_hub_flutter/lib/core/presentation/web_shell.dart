import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

/// Web-optimized shell with sidebar navigation
/// Provides a consistent layout for web with collapsible sidebar
class WebShell extends StatefulWidget {
  final Widget body;
  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<WebNavItem> navItems;
  final Widget? header;
  final Widget? floatingActionButton;
  
  const WebShell({
    Key? key,
    required this.body,
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.navItems,
    this.header,
    this.floatingActionButton,
  }) : super(key: key);

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  bool _isExpanded = true;
  
  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isCompact = width < 1200;
    
    // On mobile, use bottom navigation
    if (width < 600) {
      return Scaffold(
        body: widget.body,
        floatingActionButton: widget.floatingActionButton,
        bottomNavigationBar: NavigationBar(
          selectedIndex: widget.selectedIndex,
          onDestinationSelected: widget.onDestinationSelected,
          destinations: widget.navItems
              .map((item) => NavigationDestination(
                    icon: Icon(item.icon),
                    selectedIcon: Icon(item.selectedIcon ?? item.icon),
                    label: item.label,
                  ))
              .toList(),
        ),
      );
    }
    
    // On tablet/desktop, use sidebar
    return Scaffold(
      body: Row(
        children: [
          // Sidebar
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: _isExpanded ? 260 : 72,
            child: _buildSidebar(isCompact),
          ),
          
          // Divider
          const VerticalDivider(width: 1, thickness: 1),
          
          // Main content
          Expanded(
            child: Column(
              children: [
                // Top bar for web
                if (kIsWeb) _buildTopBar(),
                
                // Body
                Expanded(child: widget.body),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: widget.floatingActionButton,
    );
  }
  
  Widget _buildSidebar(bool isCompact) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          // Header / Logo
          Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                // Logo
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Theme.of(context).colorScheme.primary,
                        Theme.of(context).colorScheme.secondary,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(
                    child: Text(
                      'V',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                
                if (_isExpanded) ...[
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Verlyx Hub',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
                
                // Collapse button
                IconButton(
                  icon: Icon(
                    _isExpanded 
                        ? Icons.chevron_left_rounded 
                        : Icons.chevron_right_rounded,
                  ),
                  onPressed: () {
                    setState(() {
                      _isExpanded = !_isExpanded;
                    });
                  },
                  tooltip: _isExpanded ? 'Colapsar' : 'Expandir',
                ),
              ],
            ),
          ),
          
          const Divider(height: 1),
          
          // Navigation items
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                for (int i = 0; i < widget.navItems.length; i++)
                  _buildNavItem(widget.navItems[i], i),
              ],
            ),
          ),
          
          const Divider(height: 1),
          
          // Footer
          if (_isExpanded)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                '© 2026 Verlyx Hub',
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
            ),
        ],
      ),
    );
  }
  
  Widget _buildNavItem(WebNavItem item, int index) {
    final isSelected = widget.selectedIndex == index;
    final colorScheme = Theme.of(context).colorScheme;
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Material(
        color: isSelected 
            ? colorScheme.primaryContainer 
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: () => widget.onDestinationSelected(index),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            height: 48,
            padding: EdgeInsets.symmetric(
              horizontal: _isExpanded ? 16 : 0,
            ),
            child: Row(
              mainAxisAlignment: _isExpanded 
                  ? MainAxisAlignment.start 
                  : MainAxisAlignment.center,
              children: [
                Icon(
                  isSelected 
                      ? (item.selectedIcon ?? item.icon) 
                      : item.icon,
                  color: isSelected 
                      ? colorScheme.onPrimaryContainer 
                      : colorScheme.onSurfaceVariant,
                  size: 24,
                ),
                if (_isExpanded) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.label,
                      style: TextStyle(
                        color: isSelected 
                            ? colorScheme.onPrimaryContainer 
                            : colorScheme.onSurfaceVariant,
                        fontWeight: isSelected 
                            ? FontWeight.w600 
                            : FontWeight.normal,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (item.badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: colorScheme.error,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        item.badge!,
                        style: TextStyle(
                          color: colorScheme.onError,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildTopBar() {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor,
          ),
        ),
      ),
      child: Row(
        children: [
          // Breadcrumb or title
          Text(
            widget.navItems[widget.selectedIndex].label,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          
          const Spacer(),
          
          // Search (optional)
          SizedBox(
            width: 300,
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Buscar...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Notifications
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
            tooltip: 'Notificaciones',
          ),
          
          const SizedBox(width: 8),
          
          // User avatar
          CircleAvatar(
            radius: 18,
            backgroundColor: Theme.of(context).colorScheme.primary,
            child: const Text(
              'U',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Navigation item for WebShell
class WebNavItem {
  final IconData icon;
  final IconData? selectedIcon;
  final String label;
  final String? badge;
  
  const WebNavItem({
    required this.icon,
    this.selectedIcon,
    required this.label,
    this.badge,
  });
}
