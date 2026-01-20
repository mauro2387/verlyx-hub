import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_provider.dart';
import '../../data/repositories/my_companies_repository.dart';
import '../../data/models/my_company_model.dart';

final myCompaniesRepositoryProvider = Provider<MyCompaniesRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return MyCompaniesRepository(dio);
});

final myCompaniesProvider = FutureProvider<List<MyCompanyModel>>((ref) async {
  final repository = ref.watch(myCompaniesRepositoryProvider);
  return await repository.getMyCompanies();
});

final myCompanyProvider = FutureProvider.family<MyCompanyModel, String>((ref, id) async {
  final repository = ref.watch(myCompaniesRepositoryProvider);
  return await repository.getMyCompany(id);
});
