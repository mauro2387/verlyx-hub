import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/dio_provider.dart';
import '../data/models/my_company_model.dart';
import '../data/repositories/my_companies_repository.dart';

// Repository provider
final myCompaniesRepositoryProvider = Provider<MyCompaniesRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return MyCompaniesRepository(dio);
});

// Lista de empresas del usuario
final myCompaniesListProvider = FutureProvider<List<MyCompanyModel>>((ref) async {
  final repository = ref.watch(myCompaniesRepositoryProvider);
  return repository.getMyCompanies();
});

// Empresa seleccionada (guardada en SharedPreferences)
final selectedMyCompanyProvider = StateNotifierProvider<SelectedMyCompanyNotifier, MyCompanyModel?>((ref) {
  return SelectedMyCompanyNotifier(ref);
});

class SelectedMyCompanyNotifier extends StateNotifier<MyCompanyModel?> {
  final Ref ref;
  
  SelectedMyCompanyNotifier(this.ref) : super(null) {
    _loadSelectedCompany();
  }
  
  Future<void> _loadSelectedCompany() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final companyId = prefs.getString('selected_my_company_id');
      
      if (companyId != null) {
        final repository = ref.read(myCompaniesRepositoryProvider);
        final company = await repository.getMyCompany(companyId);
        state = company;
      } else {
        // Si no hay empresa seleccionada, cargar la primera disponible
        final companies = await ref.read(myCompaniesListProvider.future);
        if (companies.isNotEmpty) {
          await selectCompany(companies.first);
        }
      }
    } catch (e) {
      print('Error loading selected company: $e');
    }
  }
  
  Future<void> selectCompany(MyCompanyModel company) async {
    state = company;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('selected_my_company_id', company.id);
  }
  
  Future<void> clearSelection() async {
    state = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('selected_my_company_id');
  }
}

// Provider para obtener el ID de la empresa seleccionada (útil para queries)
final selectedMyCompanyIdProvider = Provider<String?>((ref) {
  final selectedCompany = ref.watch(selectedMyCompanyProvider);
  return selectedCompany?.id;
});
