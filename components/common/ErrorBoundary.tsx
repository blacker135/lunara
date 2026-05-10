// ============================================================
// components/common/ErrorBoundary.tsx — 全局错误边界组件
// ============================================================
// React Error Boundary，捕获子组件渲染时的未处理异常，
// 显示友好的错误提示界面，支持重试。
// ============================================================

'use client';
import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }

interface State { hasError: boolean; }

/**
 * ErrorBoundary — React 类组件错误边界
 * 捕获子组件的渲染错误，防止整个应用白屏
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  /** 从错误中派生状态 */
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  /** 渲染错误界面或正常子组件 */
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-[#2B2B2B]">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[#777777]">
              An unexpected error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 rounded-[12px] bg-[#FF7A59] px-6 py-2 text-sm text-white transition-colors hover:bg-[#FF7A59]/90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
