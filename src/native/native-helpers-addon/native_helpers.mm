#import <napi.h>
#import <Cocoa/Cocoa.h>
#import <CoreGraphics/CoreGraphics.h>
#import <objc/runtime.h>
#include <cmath>
#include <cstring>

// Sibling glass composition behind Chromium is not qualified. Bound visual
// effects are the supported native path; never report glass from this addon.
@interface LauncherEffectView : NSVisualEffectView
@end
@implementation LauncherEffectView
- (NSView *)hitTest:(NSPoint)point { return nil; }
- (BOOL)isAccessibilityElement { return NO; }
@end

static char kLauncherRegionsKey;

static NSView *LauncherHost(Napi::Value value) {
  if (!value.IsBuffer()) return nil;
  Napi::Buffer<char> buffer = value.As<Napi::Buffer<char>>();
  if (buffer.Length() < sizeof(void *)) return nil;
  void *raw = nullptr;
  memcpy(&raw, buffer.Data(), sizeof(raw));
  if (!raw) return nil;
  id object = (__bridge id)raw;
  if ([object isKindOfClass:[NSWindow class]]) return [(NSWindow *)object contentView];
  if ([object isKindOfClass:[NSView class]]) {
    NSView *view = (NSView *)object;
    return view.window.contentView ?: view;
  }
  return nil;
}

static void ClearOwned(NSView *host) {
  NSMutableDictionary *owned = objc_getAssociatedObject(host, &kLauncherRegionsKey);
  for (NSView *view in owned.allValues) [view removeFromSuperview];
  [owned removeAllObjects];
  objc_setAssociatedObject(host, &kLauncherRegionsKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

Napi::Value ClearLauncherMaterialRegions(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected native window handle Buffer").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  NSView *host = LauncherHost(info[0]);
  if (host) {
    void (^clear)(void) = ^{ ClearOwned(host); };
    if ([NSThread isMainThread]) clear(); else dispatch_sync(dispatch_get_main_queue(), clear);
  }
  return env.Undefined();
}

Napi::Value UpdateLauncherMaterialRegions(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsObject()) {
    Napi::TypeError::New(env, "Expected native window handle Buffer and options").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Object options = info[1].As<Napi::Object>();
  if (!options.Has("regions") || !options.Get("regions").IsArray() ||
      !options.Has("material") || !options.Get("material").IsString() ||
      !options.Has("fallbackMaterial") || !options.Get("fallbackMaterial").IsString() ||
      !options.Has("appearance") || !options.Get("appearance").IsString()) {
    Napi::TypeError::New(env, "Invalid material options").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  std::string material = options.Get("material").As<Napi::String>().Utf8Value();
  std::string fallback = options.Get("fallbackMaterial").As<Napi::String>().Utf8Value();
  std::string appearance = options.Get("appearance").As<Napi::String>().Utf8Value();
  if ((material != "glass" && material != "visual-effect" && material != "none") ||
      (fallback != "hud" && fallback != "under-window-background") ||
      (appearance != "light" && appearance != "dark")) {
    Napi::TypeError::New(env, "Invalid material or appearance").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Array regions = options.Get("regions").As<Napi::Array>();
  NSMutableDictionary<NSString *, NSValue *> *frames = [NSMutableDictionary dictionary];
  NSMutableDictionary<NSString *, NSNumber *> *radii = [NSMutableDictionary dictionary];
  bool valid = true;
  for (uint32_t i = 0; i < regions.Length(); i++) {
    Napi::Value item = regions.Get(i);
    if (!item.IsObject()) { valid = false; break; }
    Napi::Object region = item.As<Napi::Object>();
    if (!region.Has("id") || !region.Get("id").IsString()) { valid = false; break; }
    std::string id = region.Get("id").As<Napi::String>().Utf8Value();
    if (id != "search" && id != "results" && id != "answer" && id != "legacy") { valid = false; break; }
    const char *keys[] = {"x", "y", "width", "height", "radius"};
    double values[5] = {};
    for (int j = 0; j < 5; j++) {
      Napi::Value value = region.Get(keys[j]);
      if (!value.IsNumber() || !std::isfinite(values[j] = value.As<Napi::Number>().DoubleValue())) valid = false;
    }
    if (!valid || values[2] < 0 || values[3] < 0 || values[4] < 0) { valid = false; break; }
    NSString *key = [NSString stringWithUTF8String:id.c_str()];
    if (frames[key]) { valid = false; break; }
    frames[key] = [NSValue valueWithRect:NSMakeRect(values[0], values[1], values[2], values[3])];
    radii[key] = @(values[4]);
  }
  if (!valid) {
    Napi::TypeError::New(env, "Invalid or duplicate material region").ThrowAsJavaScriptException();
    return env.Undefined();
  }
  NSView *host = LauncherHost(info[0]);
  __block bool attached = false;
  void (^apply)(void) = ^{
    if (!host || !host.window) return;
    if (material == "none" || frames.count == 0) { ClearOwned(host); attached = true; return; }
    NSMutableDictionary<NSString *, LauncherEffectView *> *owned = objc_getAssociatedObject(host, &kLauncherRegionsKey);
    if (!owned) {
      owned = [NSMutableDictionary dictionary];
      objc_setAssociatedObject(host, &kLauncherRegionsKey, owned, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    for (NSString *key in [owned.allKeys copy]) {
      if (!frames[key]) { [owned[key] removeFromSuperview]; [owned removeObjectForKey:key]; }
    }
    for (NSString *key in frames) {
      NSRect rect = frames[key].rectValue;
      if (!host.isFlipped) rect.origin.y = NSMinY(host.bounds) + NSHeight(host.bounds) - rect.origin.y - rect.size.height;
      LauncherEffectView *view = owned[key];
      if (!view) {
        view = [[LauncherEffectView alloc] initWithFrame:rect];
        view.blendingMode = NSVisualEffectBlendingModeBehindWindow;
        view.state = NSVisualEffectStateActive;
        owned[key] = view;
        [host addSubview:view positioned:NSWindowBelow relativeTo:nil];
      }
      view.material = fallback == "hud" ? NSVisualEffectMaterialHUDWindow : NSVisualEffectMaterialUnderWindowBackground;
      view.appearance = [NSAppearance appearanceNamed:appearance == "dark" ? NSAppearanceNameDarkAqua : NSAppearanceNameAqua];
      view.frame = rect;
      view.wantsLayer = YES;
      view.layer.cornerRadius = radii[key].doubleValue;
      view.layer.masksToBounds = YES;
    }
    attached = true;
  };
  if ([NSThread isMainThread]) apply(); else dispatch_sync(dispatch_get_main_queue(), apply);
  Napi::Object result = Napi::Object::New(env);
  result.Set("material", attached && material != "none" && frames.count ? "visual-effect" : "opaque");
  result.Set("attached", Napi::Boolean::New(env, attached));
  if (!attached) result.Set("reason", "attachment-failed");
  else if (material == "glass") result.Set("reason", "glass-unqualified");
  return result;
}

Napi::Value GetAccessibilityDisplayPreferences(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  __block BOOL transparency = NO, contrast = NO, differentiate = NO, invert = NO, motion = NO;
  void (^readPreferences)(void) = ^{
    NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
    transparency = workspace.accessibilityDisplayShouldReduceTransparency;
    contrast = workspace.accessibilityDisplayShouldIncreaseContrast;
    differentiate = workspace.accessibilityDisplayShouldDifferentiateWithoutColor;
    invert = workspace.accessibilityDisplayShouldInvertColors;
    motion = workspace.accessibilityDisplayShouldReduceMotion;
  };
  if ([NSThread isMainThread]) readPreferences(); else dispatch_sync(dispatch_get_main_queue(), readPreferences);
  Napi::Object result = Napi::Object::New(env);
  result.Set("reduceMotion", Napi::Boolean::New(env, motion));
  result.Set("reduceTransparency", Napi::Boolean::New(env, transparency));
  result.Set("increaseContrast", Napi::Boolean::New(env, contrast));
  result.Set("differentiateWithoutColor", Napi::Boolean::New(env, differentiate));
  result.Set("invertColors", Napi::Boolean::New(env, invert));
  return result;
}

// Activate an app by bundle ID or name, poll until frontmost (up to 500ms).
// Returns true if the app was successfully activated.
Napi::Value ActivateApp(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument (bundleId or appName)")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string identifier = info[0].As<Napi::String>().Utf8Value();
  NSString *target = [NSString stringWithUTF8String:identifier.c_str()];

  // Try bundle ID first
  NSRunningApplication *app = nil;
  NSArray *apps = [NSRunningApplication runningApplicationsWithBundleIdentifier:target];
  if (apps.count > 0) {
    app = apps[0];
  } else {
    // Fallback: match by localized name
    for (NSRunningApplication *running in [[NSWorkspace sharedWorkspace] runningApplications]) {
      if ([running.localizedName isEqualToString:target]) {
        app = running;
        break;
      }
    }
  }

  if (!app) {
    return Napi::Boolean::New(env, false);
  }

  BOOL activated = [app activateWithOptions:0];
  if (!activated) {
    return Napi::Boolean::New(env, false);
  }

  // Poll until frontmost (up to 500ms)
  for (int i = 0; i < 100; i++) {
    NSRunningApplication *front = [[NSWorkspace sharedWorkspace] frontmostApplication];
    if (front && ([front.bundleIdentifier isEqualToString:target] ||
                  [front.localizedName isEqualToString:target])) {
      break;
    }
    usleep(5000); // 5ms
  }

  return Napi::Boolean::New(env, true);
}

// Post ⌘V via CGEvent. Returns true on success.
Napi::Value PostPaste(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  CGKeyCode vKey = 0x09; // kVK_ANSI_V

  CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
  if (!source) {
    return Napi::Boolean::New(env, false);
  }

  CGEventRef keyDown = CGEventCreateKeyboardEvent(source, vKey, true);
  CGEventRef keyUp = CGEventCreateKeyboardEvent(source, vKey, false);

  if (!keyDown || !keyUp) {
    if (keyDown) CFRelease(keyDown);
    if (keyUp) CFRelease(keyUp);
    CFRelease(source);
    return Napi::Boolean::New(env, false);
  }

  CGEventSetFlags(keyDown, kCGEventFlagMaskCommand);
  CGEventSetFlags(keyUp, kCGEventFlagMaskCommand);

  CGEventPost(kCGHIDEventTap, keyDown);
  CGEventPost(kCGHIDEventTap, keyUp);

  CFRelease(keyDown);
  CFRelease(keyUp);
  CFRelease(source);

  return Napi::Boolean::New(env, true);
}

// Disable the native NSWindow appear/disappear animation for a given Electron
// BrowserWindow. macOS Tahoe (26) animates panel-style windows on show; this
// makes the launcher feel sluggish. Setting animationBehavior to None opts the
// window out of those system animations.
//
// Argument: Buffer from BrowserWindow.getNativeWindowHandle() — on macOS this
// is the NSView* of the content view, from which we reach the NSWindow.
Napi::Value SetWindowAnimationBehaviorNone(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected Buffer (native window handle)")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Buffer<char> handleBuf = info[0].As<Napi::Buffer<char>>();
  if (handleBuf.Length() < sizeof(void*)) {
    return Napi::Boolean::New(env, false);
  }

  void *raw = *reinterpret_cast<void**>(handleBuf.Data());
  if (!raw) {
    return Napi::Boolean::New(env, false);
  }

  id obj = (__bridge id)raw;
  NSWindow *window = nil;
  if ([obj isKindOfClass:[NSView class]]) {
    window = [(NSView *)obj window];
  } else if ([obj isKindOfClass:[NSWindow class]]) {
    window = (NSWindow *)obj;
  }
  if (!window) {
    return Napi::Boolean::New(env, false);
  }

  [window setAnimationBehavior:NSWindowAnimationBehaviorNone];
  return Napi::Boolean::New(env, true);
}

// Activate app + post ⌘V in one call
Napi::Value ActivateAndPaste(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Activate
  Napi::Value activated = ActivateApp(info);
  if (!activated.As<Napi::Boolean>().Value()) {
    return Napi::Boolean::New(env, false);
  }

  // Small settle time
  usleep(30000); // 30ms

  // Paste
  return PostPaste(info);
}

// Returns NSPasteboard.general.changeCount — an integer that increments
// whenever any application writes to the system pasteboard.  Checking this
// value is O(1) and avoids reading pasteboard data entirely when nothing has
// changed.
Napi::Value GetPasteboardChangeCount(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  NSInteger count = [[NSPasteboard generalPasteboard] changeCount];
  return Napi::Number::New(env, (double)count);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("updateLauncherMaterialRegions", Napi::Function::New(env, UpdateLauncherMaterialRegions));
  exports.Set("clearLauncherMaterialRegions", Napi::Function::New(env, ClearLauncherMaterialRegions));
  exports.Set("getAccessibilityDisplayPreferences", Napi::Function::New(env, GetAccessibilityDisplayPreferences));
  exports.Set("activateApp", Napi::Function::New(env, ActivateApp));
  exports.Set("postPaste", Napi::Function::New(env, PostPaste));
  exports.Set("activateAndPaste", Napi::Function::New(env, ActivateAndPaste));
  exports.Set("getPasteboardChangeCount", Napi::Function::New(env, GetPasteboardChangeCount));
  exports.Set("setWindowAnimationBehaviorNone",
              Napi::Function::New(env, SetWindowAnimationBehaviorNone));
  return exports;
}

NODE_API_MODULE(native_helpers, Init)

