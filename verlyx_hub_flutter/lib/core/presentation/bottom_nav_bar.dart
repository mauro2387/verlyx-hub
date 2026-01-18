import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

BottomNavigationBar buildBottomNavBar(BuildContext context, int currentIndex) {
  return BottomNavigationBar(
    currentIndex: currentIndex,
    type: BottomNavigationBarType.fixed,
    selectedItemColor: Theme.of(context).primaryColor,
    unselectedItemColor: Colors.grey,
    onTap: (index) {
      switch (index) {
        case 0:
          context.go('/');
          break;
        case 1:
          context.go('/projects');
          break;
        case 2:
          context.go('/tasks');
          break;
        case 3:
          context.go('/ai');
          break;
        case 4:
          showModalBottomSheet(
            context: context,
            builder: (context) => ListView(
              shrinkWrap: true,
              children: [
                ListTile(
                  leading: const Icon(Icons.business),
                  title: const Text('Mis Empresas'),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/my-companies');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.people),
                  title: const Text('Clientes'),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/clients');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.description),
                  title: const Text('Documentos'),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/documents');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.payment),
                  title: const Text('Pagos'),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/payments');
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.hub),
                  title: const Text('Verlyx Ecosystem'),
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/verlyx');
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text('Cerrar sesión', style: TextStyle(color: Colors.red)),
                  onTap: () {
                    Navigator.pop(context);
                    context.go('/login');
                  },
                ),
              ],
            ),
          );
          break;
      }
    },
    items: const [
      BottomNavigationBarItem(
        icon: Icon(Icons.dashboard_outlined),
        activeIcon: Icon(Icons.dashboard),
        label: 'Dashboard',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.folder_outlined),
        activeIcon: Icon(Icons.folder),
        label: 'Proyectos',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.task_outlined),
        activeIcon: Icon(Icons.task),
        label: 'Tareas',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.auto_awesome_outlined),
        activeIcon: Icon(Icons.auto_awesome),
        label: 'IA',
      ),
      BottomNavigationBarItem(
        icon: Icon(Icons.more_horiz),
        label: 'Más',
      ),
    ],
  );
}
