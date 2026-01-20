import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class MoreScreen extends ConsumerWidget {
  const MoreScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Más opciones'),
        automaticallyImplyLeading: false,
      ),
      body: ListView(
        children: [
          _buildSection(
            context,
            'Gestión',
            [
              _buildTile(
                context,
                icon: Icons.description_outlined,
                title: 'Documentos',
                subtitle: 'Gestión de archivos y documentos',
                onTap: () => context.push('/documents'),
              ),
              _buildTile(
                context,
                icon: Icons.payment_outlined,
                title: 'Pagos',
                subtitle: 'Historial de transacciones',
                onTap: () => context.push('/payments'),
              ),
            ],
          ),
          _buildSection(
            context,
            'Herramientas',
            [
              _buildTile(
                context,
                icon: Icons.hub_outlined,
                title: 'Verlyx Ecosystem',
                subtitle: 'Explora el ecosistema Verlyx',
                onTap: () => context.push('/verlyx'),
              ),
            ],
          ),
          _buildSection(
            context,
            'Cuenta',
            [
              _buildTile(
                context,
                icon: Icons.settings_outlined,
                title: 'Configuración',
                subtitle: 'Ajustes de la aplicación',
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Próximamente')),
                  );
                },
              ),
              _buildTile(
                context,
                icon: Icons.logout,
                title: 'Cerrar sesión',
                subtitle: 'Salir de la aplicación',
                textColor: Colors.red,
                onTap: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Cerrar sesión'),
                      content: const Text('¿Estás seguro de que deseas cerrar sesión?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancelar'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          style: TextButton.styleFrom(foregroundColor: Colors.red),
                          child: const Text('Cerrar sesión'),
                        ),
                      ],
                    ),
                  );

                  if (confirm == true && context.mounted) {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) {
                      context.go('/login');
                    }
                  }
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, List<Widget> tiles) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Colors.grey[600],
                  fontWeight: FontWeight.bold,
                ),
          ),
        ),
        ...tiles,
        const Divider(height: 1),
      ],
    );
  }

  Widget _buildTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color? textColor,
  }) {
    return ListTile(
      leading: Icon(icon, color: textColor),
      title: Text(
        title,
        style: TextStyle(color: textColor),
      ),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }
}
