class UserEntity {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String? avatarUrl;

  const UserEntity({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    this.avatarUrl,
  });
}
