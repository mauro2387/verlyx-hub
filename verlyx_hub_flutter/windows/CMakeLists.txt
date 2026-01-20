cmake_minimum_required(VERSION 3.14)
project(verlyx_hub LANGUAGES CXX)

set(BINARY_NAME "verlyx_hub")

cmake_policy(SET CMP0063 NEW)

set(CMAKE_INSTALL_RPATH "$ORIGIN/lib")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE "Debug" CACHE
    STRING "Flutter build mode" FORCE)
  set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
    "Debug" "Profile" "Release")
endif()

set(FLUTTER_MANAGED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/flutter")

add_subdirectory(${FLUTTER_MANAGED_DIR})

add_subdirectory("runner")

add_custom_target(copy_assets
    COMMAND ${CMAKE_COMMAND} -E copy_directory
    "${PROJECT_BUILD_DIR}/../assets"
    "${CMAKE_BINARY_DIR}/runner/Release/data/flutter_assets/assets")

add_dependencies(${BINARY_NAME} copy_assets)
