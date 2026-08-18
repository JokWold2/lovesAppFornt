# tt-google-signin

🚀 **Google 授权登录插件**，为 uni-app x & uni-app 提供完整的 Google Sign-In 集成解决方案

## 📖 目录
- [SDK版本信息](#sdk版本信息)
- [环境配置](#环境配置)
- [快速开始](#快速开始)
- [功能介绍](#功能介绍)
  - [Google 授权登录](#google-授权登录)
  - [Google 退出登录](#google-退出登录)
- [错误处理](#错误处理)
- [常见问题](#常见问题)

## SDK版本信息

| 平台 | 版本 | 支持状态 |
|------|------|----------|
| iOS | 9.0.0 | ✅ 完全支持 |
| Android | Credential Manager 1.3.0<br>Google Identity 1.1.1 | ✅ 完全支持 |

### 功能支持矩阵

| 功能 | iOS | Android |
|------|-----|---------|
| Google登录 | ✅ | ✅ |
| Google退出登录 | ✅ | ✅ |

📚 **推荐阅读**: 
- [Google Sign-In iOS 集成文档](https://developers.google.com/identity/sign-in/ios)
- [Google Sign-In Android 集成文档](https://developers.google.com/identity/sign-in/android)

## 🚨 重要提示

⚠️ **必须使用自定义基座运行**，否则无法找到插件方法  
⚠️ **Android**: 默认使用新版 Credential Manager API，如需使用旧版 API 请设置 `useLegacyLogin: true` 或 `useLegacyLogout: true`  
⚠️ **Android**: 确保设备已安装 Google Play 服务（GMS），否则登录可能失败  
⚠️ **Android**: 确保应用签名与 Google Cloud Console 配置的签名一致  
⚠️ **iOS**: 确保在 Google Cloud Console 正确配置了 iOS 客户端 ID 和 URL Scheme  
⚠️ **编译报错排查**：本插件会定期更新至最新版SDK，某些情况下编译报错可能不是插件不可用，而是本地环境问题或与官方插件冲突，遇到此类情况可通过IM联系我协助解决

## 环境配置

### 前置条件
1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建项目
2. 启用 Google Sign-In API
3. 创建 OAuth 2.0 客户端 ID：
   - **Android**: 配置应用包名和 SHA-1 证书指纹
   - **iOS**: 配置 Bundle ID 和 URL Scheme

### iOS平台配置

#### 1. 配置 Info.plist
编辑插件内的 `uni_modules/tt-google-signin/utssdk/app-ios/Info.plist`，将以下配置项补充为您的实际值：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>GIDClientID</key>
    <string>YOUR_IOS_CLIENT_ID</string>
    <key>CFBundleURLTypes</key>
    <array>
      <dict>
        <key>CFBundleURLSchemes</key>
        <array>
          <string>YOUR_DOT_REVERSED_IOS_CLIENT_ID</string>
        </array>
      </dict>
    </array>
  </dict>
</plist>
```

**配置说明：**
- `YOUR_IOS_CLIENT_ID`: 替换为您的 iOS OAuth 客户端 ID（格式：`123456789-abcdefg.apps.googleusercontent.com`）
- `YOUR_DOT_REVERSED_IOS_CLIENT_ID`: 替换为反向的客户端 ID（格式：`com.googleusercontent.apps.123456789-abcdefg`）
  - 反向客户端 ID：将客户端 ID 中的点（.）分隔的字段按相反顺序排列
  - 例如：`123456789-abcdefg.apps.googleusercontent.com` → `com.googleusercontent.apps.123456789-abcdefg`
  - 在 Google Cloud Console 的 iOS OAuth 客户端详情页面可以找到 "iOS URL Scheme"

### Android平台配置

Android平台会自动完成相关配置，确保在 Google Cloud Console 正确配置应用包名和 SHA-1 证书指纹即可。

**重要提示：**
- 确保在 Google Cloud Console 创建了 **Android** OAuth 客户端 ID
- 配置正确的应用包名
- 配置正确的 SHA-1 证书指纹（用于签名验证）
- 使用自定义基座时，确保使用正确的签名证书

## 快速开始

### 1. 导入插件

#### uni-app x 版本

```typescript
import * as googleSignin from "@/uni_modules/tt-google-signin";

export default {
    data() {
        return {
            googleSDK: null as googleSignin.TTGoogleSign | null,
        }
    },
    onLoad() {
        // 初始化Google Sign SDK实例
        this.googleSDK = googleSignin.getTTGoogleSign()
    },
    onUnload() {
        // 页面销毁释放实例
        this.googleSDK = null
    },
    methods: {
        // 使用SDK功能
    }
}
```

#### uni-app 版本

```javascript
import * as googleSignin from "@/uni_modules/tt-google-signin";

export default {
    data() {
        return {
            googleSDK: null,
        }
    },
    onLoad() {
        // 初始化Google Sign SDK实例
        this.googleSDK = googleSignin.getTTGoogleSign()
    },
    onUnload() {
        // 页面销毁释放实例
        this.googleSDK = null
    },
    methods: {
        // 使用SDK功能
    }
}
```

## 功能介绍

## Google 授权登录

> 💡 Google 登录使用 OAuth 2.0 协议，登录成功后会返回 ID Token 和 Access Token，可用于验证用户身份和访问 Google API

### 参数说明

**TTGoogleLoginOptions**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| serverClientId | string | ✅ | Google 客户端 ID，格式：`xxxxx.apps.googleusercontent.com` |
| useLegacyLogin | boolean \| null | ❌ | 是否使用旧版 Google Sign-In API 登录（仅 Android 平台有效）<br>- `false` 或 `null`（默认）：使用新版 Credential Manager API<br>- `true`：使用旧版 Google Sign-In API |
| （无） |  |  | 当前登录无需传入 scopes，返回基本信息所需权限由 SDK 处理 |

**返回值 TTGoogleLoginSuccess**

| 参数 | 类型 | 说明 |
|------|------|------|
| idToken | string | 用于验证用户身份的 ID Token（JWT格式） |
| accessToken | string \| null | 用于访问 Google API 的 Access Token |
| userID | string \| null | 用户ID（Google用户唯一标识） |
| name | string \| null | 用户名称 |
| pictureURL | string \| null | 用户头像URL |
| email | string \| null | 用户邮箱 |

### 行为说明

- 登录成功必然返回 `idToken`（用于验证用户身份）
- `accessToken` 在 iOS 平台通常可用，Android 平台可能为 `null`（取决于 Credential Manager 实现）
- 用户信息字段（`userID/name/pictureURL/email`）在权限允许且平台可获取时返回
- 建议使用 `idToken` 在后端验证用户身份，而不是依赖 `accessToken`

### Android 平台 API 版本说明

**新版 Credential Manager API（默认）**：
- 使用 Google 最新的 Credential Manager API
- 推荐使用，获得更好的用户体验和兼容性
- 默认使用，无需额外配置

**旧版 Google Sign-In API**：
- 使用传统的 Google Sign-In API
- 仅当新版 API 无法使用时才考虑使用
- 需要设置 `useLegacyLogin: true` 或 `useLegacyLogout: true`

### 示例代码

#### uni-app x 版本

```typescript
// Google 授权登录（使用新版 Credential Manager API，默认）
handleGoogleLogin() {
    this.googleSDK?.login({
        serverClientId: "YOUR_SERVER_CLIENT_ID.apps.googleusercontent.com", // 必填：Google 客户端 ID
        // useLegacyLogin 不设置或设置为 false，使用新版 API（默认）
        success: (result) => {
            console.log("✅ Google登录成功");
            console.log("ID Token:", result.idToken.substring(0, 50) + "...");
            if (result.accessToken != null) {
                console.log("Access Token:", result.accessToken.substring(0, 50) + "...");
            }
            if (result.userID != null) {
                console.log("用户ID:", result.userID);
            }
            if (result.name != null) {
                console.log("用户名:", result.name);
            }
            if (result.email != null) {
                console.log("邮箱:", result.email);
            }
            
            // 将 ID Token 发送到后端服务器进行验证
            this.sendIdTokenToServer(result.idToken)
        },
        fail: (error) => {
            console.error("❌ Google登录失败:", error);
            uni.showToast({
                title: error.errMsg || '登录失败',
                icon: 'error'
            })
        },
        complete: (res) => {
            console.log("登录完成", res);
        }
    } as googleSignin.TTGoogleLoginOptions)
}

// Google 授权登录（使用旧版 Google Sign-In API，仅 Android 平台）
handleGoogleLoginLegacy() {
    this.googleSDK?.login({
        serverClientId: "YOUR_SERVER_CLIENT_ID.apps.googleusercontent.com", // 必填：Google 客户端 ID
        useLegacyLogin: true, // 明确指定使用旧版 API（仅 Android 平台有效）
        success: (result) => {
            console.log("✅ Google登录成功");
            // 处理登录成功逻辑...
        },
        fail: (error) => {
            console.error("❌ Google登录失败:", error);
        }
    } as googleSignin.TTGoogleLoginOptions)
}

// 发送 ID Token 到后端服务器
sendIdTokenToServer(idToken: string) {
    uni.request({
        url: 'https://your-server.com/api/google/login',
        method: 'POST',
        data: { idToken },
        success: (res) => {
            // 处理登录成功逻辑
            console.log('登录成功:', res.data)
        },
        fail: (err) => {
            console.error('登录请求失败:', err)
        }
    })
}
```

#### uni-app 版本

```javascript
// Google 授权登录（使用新版 Credential Manager API，默认）
handleGoogleLogin() {
    this.googleSDK.login({
        serverClientId: "YOUR_SERVER_CLIENT_ID.apps.googleusercontent.com", // 必填：Google 客户端 ID
        // useLegacyLogin 不设置或设置为 false，使用新版 API（默认）
        success: (result) => {
            console.log("✅ Google登录成功");
            console.log("ID Token:", result.idToken.substring(0, 50) + "...");
            
            // 将 ID Token 发送到后端服务器进行验证
            this.sendIdTokenToServer(result.idToken)
        },
        fail: (error) => {
            console.error("❌ Google登录失败:", error);
            uni.showToast({
                title: error.errMsg || '登录失败',
                icon: 'error'
            })
        },
        complete: (res) => {
            console.log("登录完成", res);
        }
    })
}

// Google 授权登录（使用旧版 Google Sign-In API，仅 Android 平台）
handleGoogleLoginLegacy() {
    this.googleSDK.login({
        serverClientId: "YOUR_SERVER_CLIENT_ID.apps.googleusercontent.com",
        useLegacyLogin: true, // 明确指定使用旧版 API（仅 Android 平台有效）
        success: (result) => {
            console.log("✅ Google登录成功");
            // 处理登录成功逻辑...
        },
        fail: (error) => {
            console.error("❌ Google登录失败:", error);
        }
    })
}

// 发送 ID Token 到后端服务器
sendIdTokenToServer(idToken) {
    uni.request({
        url: 'https://your-server.com/api/google/login',
        method: 'POST',
        data: { idToken },
        success: (res) => {
            console.log('登录成功:', res.data)
        },
        fail: (err) => {
            console.error('登录请求失败:', err)
        }
    })
}
```

## Google 退出登录

> 💡 退出当前 Google 账户登录状态

### 参数说明

**TTGoogleLogoutOptions**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| useLegacyLogout | boolean \| null | ❌ | 是否使用旧版 Google Sign-In API 退出登录（仅 Android 平台有效）<br>- `false` 或 `null`（默认）：使用新版 Credential Manager API<br>- `true`：使用旧版 Google Sign-In API |
| success | function | ❌ | 退出登录成功回调 |
| fail | function | ❌ | 退出登录失败回调 |
| complete | function | ❌ | 完成回调（无论成功或失败） |

**返回值 TTGoogleLogoutSuccess**

空对象，表示退出登录成功

### 示例代码

#### uni-app x 版本

```typescript
// Google 退出登录（使用新版 Credential Manager API，默认）
handleGoogleLogout() {
    this.googleSDK?.logout({
        // useLegacyLogout 不设置或设置为 false，使用新版 API（默认）
        success: (result) => {
            console.log("✅ Google退出登录成功");
            uni.showToast({
                title: '退出登录成功',
                icon: 'success'
            })
        },
        fail: (error) => {
            console.error("❌ Google退出登录失败:", error);
            uni.showToast({
                title: error.errMsg || '退出登录失败',
                icon: 'error'
            })
        },
        complete: (res) => {
            console.log("退出登录完成", res);
        }
    } as googleSignin.TTGoogleLogoutOptions)
}

// Google 退出登录（使用旧版 Google Sign-In API，仅 Android 平台）
handleGoogleLogoutLegacy() {
    this.googleSDK?.logout({
        useLegacyLogout: true, // 明确指定使用旧版 API（仅 Android 平台有效）
        success: (result) => {
            console.log("✅ Google退出登录成功");
        },
        fail: (error) => {
            console.error("❌ Google退出登录失败:", error);
        }
    } as googleSignin.TTGoogleLogoutOptions)
}
```

#### uni-app 版本

```javascript
// Google 退出登录（使用新版 Credential Manager API，默认）
handleGoogleLogout() {
    this.googleSDK.logout({
        // useLegacyLogout 不设置或设置为 false，使用新版 API（默认）
        success: (result) => {
            console.log("✅ Google退出登录成功");
            uni.showToast({
                title: '退出登录成功',
                icon: 'success'
            })
        },
        fail: (error) => {
            console.error("❌ Google退出登录失败:", error);
            uni.showToast({
                title: error.errMsg || '退出登录失败',
                icon: 'error'
            })
        },
        complete: (res) => {
            console.log("退出登录完成", res);
        }
    })
}

// Google 退出登录（使用旧版 Google Sign-In API，仅 Android 平台）
handleGoogleLogoutLegacy() {
    this.googleSDK.logout({
        useLegacyLogout: true, // 明确指定使用旧版 API（仅 Android 平台有效）
        success: (result) => {
            console.log("✅ Google退出登录成功");
        },
        fail: (error) => {
            console.error("❌ Google退出登录失败:", error);
        }
    })
}
```

## 错误处理

### 错误码说明

| 错误码 | 错误信息 | 适用场景 | 解决方案 |
|--------|----------|----------|----------|
| **系统环境错误** ||||
| 101 | 系统环境错误 | Android: Activity状态异常<br>iOS: 无法获取视图控制器 | 检查应用状态，确保在正确的生命周期调用 |
| **配置错误** ||||
| 108 | 登录结果为空 | iOS: 登录返回结果为空 | 重试登录，检查 SDK 回调 |
| 109 | 用户信息为空 | iOS: 用户对象为空 | 重试登录，或检查 Google 账号状态 |
| 110 | 缺少ID Token | iOS: 无法获取 idToken | 检查 Google 账号、授权范围及配置 |
| **登录凭据错误** ||||
| 103 | 不支持的登录凭据类型 | Android: 非 Google Id Token | 检查凭据类型 |
| 104 | 无法找到对应的凭据 | Android: 应用签名/包名不匹配或与Google连接失败 | 检查：<br>- 应用包名是否正确<br>- SHA-1 证书指纹是否匹配<br>- 网络连接是否正常 |
| 105 | 登录组件缺失 | Android: GMS未安装或版本过低 | 检查设备是否安装 Google Play 服务 |
| **用户操作** ||||
| 106 | 用户取消登录 | Android/iOS: 用户主动取消 | 根据业务需求处理，通常可以忽略 |
| **退出登录** ||||
| 202 | 用户未登录 | iOS: 退出时未登录 | 确保已登录后再调用退出 |
| **其他错误** ||||
| 999 | 其他未知错误 | 所有功能 | 查看错误信息中的原始错误详情 |

### 错误处理示例

```typescript
handleGoogleLogin() {
    this.googleSDK?.login({
        serverClientId: "YOUR_SERVER_CLIENT_ID.apps.googleusercontent.com",
        success: (result) => {
            // 登录成功处理
        },
        fail: (error) => {
            // 根据错误码进行不同处理
            switch(error.errCode) {
                case 101:
                    console.error("系统环境错误，请检查应用状态");
                    break;
                case 104:
                    console.error("无法找到凭据，请检查应用签名和包名配置");
                    break;
                case 105:
                    console.error("登录组件缺失，请确保设备已安装 Google Play 服务");
                    uni.showModal({
                        title: '提示',
                        content: '请先安装 Google Play 服务',
                        showCancel: false
                    });
                    break;
                case 106:
                    console.log("用户取消登录");
                    break;
                case 108:
                    console.error("登录结果为空");
                    break;
                case 109:
                    console.error("用户信息为空");
                    break;
                case 110:
                    console.error("缺少ID Token");
                    break;
                case 202:
                    console.error("用户未登录");
                    break;
                case 999:
                    console.error("未知错误:", error.errMsg);
                    break;
            }
        },
        complete: (res) => {
            console.log("登录完成", res);
        }
    } as googleSignin.TTGoogleLoginOptions)
}
```

## 常见问题

### 1. 找不到插件方法？
**解决方案**: 确保使用自定义基座运行，标准基座不包含原生插件。

### 2. iOS平台登录无响应？
**解决方案**: 
- 检查 `uni_modules/tt-google-signin/utssdk/app-ios/Info.plist` 中的配置：
  - `GIDClientID` 是否正确配置
  - `CFBundleURLSchemes` 中的反向客户端 ID 是否正确
- 确认 Google Cloud Console 中的 iOS 客户端配置正确
- 验证 Bundle ID 是否匹配

### 3. Android平台登录失败？
**解决方案**:
- 确认设备已安装 Google Play 服务（GMS）
- 确认应用签名与 Google Cloud Console 配置的 SHA-1 证书指纹一致
- 检查包名是否正确
- 验证 `serverClientId` 参数是否正确（客户端 ID）

### 4. 提示"无法找到对应的凭据"（错误码 104）？
**解决方案**:
- **Android**: 
  - 检查应用包名是否与 Google Cloud Console 中配置的一致
  - 检查 SHA-1 证书指纹是否匹配（注意：开发环境和生产环境使用不同签名）
  - 确保在 Google Cloud Console 创建了 Android OAuth 客户端 ID
- **网络问题**: 确保设备可以访问 Google 服务

### 5. 提示"登录组件缺失"（错误码 105）？
**解决方案**:
- **Android**: 确保设备已安装 Google Play 服务（GMS）
  - 国内设备可能没有 GMS，需要用户手动安装或使用其他登录方式
  - 可以通过 Google Play Store 检查 GMS 是否可用

### 6. iOS 提示"配置错误"（错误码 102）？
**解决方案**:
- 检查 `Info.plist` 中的 `GIDClientID` 是否正确
- 检查 `CFBundleURLSchemes` 中的反向客户端 ID 格式是否正确
- 确保在 Google Cloud Console 创建了 iOS OAuth 客户端 ID
- 验证反向客户端 ID 的计算是否正确（将客户端 ID 的字段按相反顺序排列）

### 7. accessToken 为 null？
**解决方案**:
- 这是正常现象，Android 平台的 Credential Manager 可能不返回 accessToken
- 建议使用 `idToken` 在后端验证用户身份
- 如需访问 Google API，可以在后端使用 `idToken` 或通过 OAuth 2.0 流程获取 accessToken

### 8. 如何获取反向客户端 ID？
**解决方案**:
- 在 Google Cloud Console 的 iOS OAuth 客户端详情页面，可以找到 "iOS URL Scheme"
- 该值即为反向客户端 ID，直接复制使用即可
- 手动计算：将客户端 ID（如 `123456789-abcdefg.apps.googleusercontent.com`）按点分隔，然后反序排列：`com.googleusercontent.apps.123456789-abcdefg`

### 9. 如何验证 ID Token？
**解决方案**:
- 在后端使用 Google 的 Token 验证 API 验证 ID Token
- 验证 ID Token 的签名和有效期
- 提取用户信息（sub、email、name 等）
- 参考：[Google ID Token 验证文档](https://developers.google.com/identity/sign-in/web/backend-auth)

### 10. 何时需要使用旧版 Google Sign-In API？
**使用场景**:
- 新版 Credential Manager API 在您的设备或环境中无法正常工作
- 需要与现有代码库保持兼容性
- 遇到新版 API 的兼容性问题时

**使用方法**:
- 登录时设置 `useLegacyLogin: true`
- 退出登录时设置 `useLegacyLogout: true`
- 注意：此选项仅在 Android 平台有效，iOS 平台不受影响

**示例**:
```typescript
// 使用旧版 API 登录
this.googleSDK?.login({
    serverClientId: "YOUR_SERVER_CLIENT_ID.apps.googleusercontent.com",
    useLegacyLogin: true, // 使用旧版 API
    success: (result) => { ... }
} as googleSignin.TTGoogleLoginOptions)
```

## 📞 技术支持

如果在使用过程中遇到问题，请：
1. 查阅上方常见问题
2. 参考 Google 官方开发文档
3. 检查配置是否正确
4. 确认 Google Cloud Console 配置

---

**祝您开发愉快！** 🎉
