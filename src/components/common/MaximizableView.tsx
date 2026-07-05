'use client';

import React, { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X, GripHorizontal, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MaximizableViewProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  isMaximized: boolean;
  onToggle: () => void;
  onHide?: () => void;
  editMode: boolean;
  children: React.ReactNode;
}

/**
 * MaximizableView
 *
 * A draggable/resizable grid cell wrapper that can be maximised to full screen
 * via a portal. Used by the Engineering dashboard grid widgets.
 *
 * In edit mode it shows a drag handle and hide button instead of the maximize
 * toggle so the user can rearrange the layout.
 */
export const MaximizableView = forwardRef<HTMLDivElement, MaximizableViewProps>(
  (
    {
      style,
      className,
      onMouseDown,
      onMouseUp,
      onTouchEnd,
      children,
      title,
      isMaximized,
      onToggle,
      onHide,
      editMode,
      ...props
    },
    ref
  ) => {
    if (isMaximized) {
      if (typeof window === 'undefined') return null;

      return createPortal(
        <div className="animate-in fade-in fixed inset-0 z-200 flex items-center justify-center bg-black/80 backdrop-blur-sm duration-200">
          <div className="relative flex h-full w-full flex-col bg-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 p-6">
              <h2 className="flex items-center gap-3 text-2xl font-bold tracking-wider text-white">
                {title}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggle}
                  className="rounded-full bg-zinc-800 p-2 text-white transition-colors hover:bg-zinc-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-8">
              <div className="flex h-full w-full flex-col">{children}</div>
            </div>
          </div>
        </div>,
        document.body
      );
    }

    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          'group relative h-full overflow-hidden rounded-xl transition-all duration-200',
          className,
          editMode && 'hover:border-accent border border-dashed border-white/30'
        )}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchEnd={onTouchEnd}
        {...props}
      >
        <div className="h-full w-full overflow-hidden rounded-xl">
          {children}
        </div>

        {!editMode && (
          <button
            onClick={onToggle}
            className="hover:bg-accent absolute top-2 right-2 z-50 rounded bg-black/50 p-1.5 text-white opacity-0 shadow-lg backdrop-blur transition-all group-hover:opacity-100"
            title="Maximize View"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        )}

        {editMode && (
          <>
            <div className="pointer-events-none absolute top-2 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded border border-white/10 bg-black/80 px-2 py-0.5 text-[10px] text-zinc-400">
              <GripHorizontal className="h-3 w-3" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHide?.();
              }}
              className="absolute top-2 right-2 z-50 rounded border border-white/10 bg-black/80 p-1.5 text-zinc-400 transition-colors hover:bg-red-500 hover:text-white"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    );
  }
);

MaximizableView.displayName = 'MaximizableView';
