import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/my_companies_provider.dart';
import '../../data/models/my_company_model.dart';

class MyCompaniesListScreen extends ConsumerWidget {
  const MyCompaniesListScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final myCompaniesAsync = ref.watch(myCompaniesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Empresas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(myCompaniesProvider),
          ),
        ],
      ),
      body: myCompaniesAsync.when(
        data: (companies) {
          if (companies.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.business_center_outlined, size: 80, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    'No hay empresas',
                    style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Crea tus empresas: Verlyx, PulsarMoon, etc.',
                    style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => context.push('/my-companies/new'),
                    icon: const Icon(Icons.add),
                    label: const Text('Crear Mi Empresa'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: companies.length,
            itemBuilder: (context, index) {
              final company = companies[index];
              return _buildCompanyCard(context, company);
            },
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
                onPressed: () => ref.refresh(myCompaniesProvider),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/my-companies/new'),
        icon: const Icon(Icons.add),
        label: const Text('Nueva Empresa'),
      ),
    );
  }

  Widget _buildCompanyCard(BuildContext context, MyCompanyModel company) {
    final primaryColor = Color(int.parse(company.primaryColor.replaceFirst('#', '0xFF')));

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () => context.push('/my-companies/${company.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.business_center,
                  color: primaryColor,
                  size: 32,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      company.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _getTypeLabel(company.type),
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                    if (company.description != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        company.description!,
                        style: TextStyle(
                          color: Colors.grey[500],
                          fontSize: 12,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  String _getTypeLabel(String type) {
    const labels = {
      'technology': 'Tecnología',
      'consulting': 'Consultoría',
      'retail': 'Retail',
      'services': 'Servicios',
      'education': 'Educación',
      'health': 'Salud',
      'finance': 'Finanzas',
      'manufacturing': 'Manufactura',
      'real_estate': 'Inmobiliaria',
      'marketing': 'Marketing',
      'design': 'Diseño',
      'legal': 'Legal',
      'other': 'Otro',
    };
    return labels[type] ?? type;
  }
}
