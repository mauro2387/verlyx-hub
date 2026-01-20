#ifndef RUNNER_WIN32_WINDOW_H_
#define RUNNER_WIN32_WINDOW_H_

#include <windows.h>

#include <functional>
#include <memory>
#include <string>

class Win32Window {
 public:
  struct Point {
    Point(double x, double y);
    double x;
    double y;
  };

  struct Size {
    Size(double width, double height);
    double width;
    double height;
  };

  Win32Window();
  virtual ~Win32Window();

  bool Create(const std::wstring& title, const Point& origin, const Size& size);

  bool Show();

  void SetQuitOnClose(bool quit_on_close);

  bool is_visible() { return visible_; }

  HWND GetHandle();

  void SetChildContent(HWND content);

 protected:
  virtual bool OnCreate();

  virtual void OnDestroy();

  virtual LRESULT MessageHandler(HWND window,
                                  UINT const message,
                                  WPARAM const wparam,
                                  LPARAM const lparam) noexcept;

 private:
  friend class FlutterWindow;

  static const wchar_t* GetWindowClass();

  static void RegisterWindowClass();

  static LRESULT CALLBACK WndProc(HWND const window,
                                  UINT const message,
                                  WPARAM const wparam,
                                  LPARAM const lparam) noexcept;

  static Win32Window* GetThisFromHandle(HWND const window) noexcept;

  bool quit_on_close_ = false;

  bool visible_ = false;

  int Scale(int source, double scale_factor) {
    return static_cast<int>(source * scale_factor);
  }

  void UpdateTheme(HWND const window);

  RECT GetClientArea();

  void Destroy();

  HWND window_handle_ = nullptr;

  HWND child_content_ = nullptr;

  static int g_active_window_count_;

  std::wstring window_class_name_;
};

#endif  // RUNNER_WIN32_WINDOW_H_
