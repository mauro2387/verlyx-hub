import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_provider.dart';
import '../../data/repositories/clients_repository.dart';
import '../../data/models/client_model.dart';

final clientsRepositoryProvider = Provider<ClientsRepository>((ref) {
  final dio = ref.watch(dioProvider);
  return ClientsRepository(dio);
});

final clientsProvider = FutureProvider<List<ClientModel>>((ref) async {
  final repository = ref.watch(clientsRepositoryProvider);
  return await repository.getClients();
});

final clientProvider = FutureProvider.family<ClientModel, String>((ref, id) async {
  final repository = ref.watch(clientsRepositoryProvider);
  return await repository.getClient(id);
});
