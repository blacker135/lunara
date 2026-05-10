// ============================================================
// components/common/Providers.tsx — 客户端 Provider 包装器
// ============================================================
// 将需要客户端环境的功能组件（如 ErrorBoundary）
// 包装为可在服务端布局中使用的客户端组件。
// ============================================================

'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers — 客户端包装器
 * 用 ErrorBoundary 包裹所有子组件以捕获渲染错误
 */
export function Providers({ children }: ProvidersProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
