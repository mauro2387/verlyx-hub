cmake_minimum_required(VERSION 3.10)
project(verlyx_hub_runner LANGUAGES CXX)

set(BINARY_NAME "verlyx_hub")
set(APPLICATION_ID "com.verlyx.verlyx_hub")

cmake_policy(SET CMP0063 NEW)

set(CMAKE_INSTALL_RPATH "$ORIGIN/lib")

# Configure build options.
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE "Debug" CACHE
    STRING "Flutter build mode" FORCE)
  set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
    "Debug" "Profile" "Release")
endif()

# Compilation settings
add_definitions(-DUNICODE -D_UNICODE)

# Flutter library
set(FLUTTER_MANAGED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/flutter")

# Application build
add_subdirectory(${FLUTTER_MANAGED_DIR})

# System-level dependencies
find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK REQUIRED IMPORTED_TARGET gtk+-3.0)

add_executable(${BINARY_NAME}
  "main.cc"
  "my_application.cc"
  "${FLUTTER_MANAGED_DIR}/generated_plugin_registrant.cc"
)

apply_standard_settings(${BINARY_NAME})

target_link_libraries(${BINARY_NAME} PRIVATE flutter)
target_link_libraries(${BINARY_NAME} PRIVATE PkgConfig::GTK)

add_dependencies(${BINARY_NAME} flutter_assemble)

# Copy Flutter library
file(MAKE_DIRECTORY "${CMAKE_INSTALL_PREFIX}/lib/")
install(FILES "${FLUTTER_LIBRARY}" DESTINATION "${CMAKE_INSTALL_PREFIX}/lib")

# Install the executable
install(TARGETS ${BINARY_NAME} RUNTIME DESTINATION "${CMAKE_INSTALL_PREFIX}/bin")

# Install the libraries
file(GLOB NATIVE_LIBRARIES "${CMAKE_CURRENT_SOURCE_DIR}/build/native_assets/linux/*.so")
install(FILES ${NATIVE_LIBRARIES} DESTINATION "${CMAKE_INSTALL_PREFIX}/lib"
  COMPONENT Runtime)
