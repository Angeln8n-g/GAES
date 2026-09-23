import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

export interface AccessibleModalProps {
  isOpen?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  className?: string;
  role?: 'dialog' | 'alertdialog';
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  preventScroll?: boolean;
  id?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Encuentra todos los elementos enfocables interactivos y visibles dentro de un contenedor.
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    return (
      (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0) &&
      window.getComputedStyle(el).visibility !== 'hidden'
    );
  });
};

/**
 * Gestor global y seguro de bloqueo de scroll para evitar bloqueos residuales con modales anidados
 */
let activeModalsCount = 0;
let previousBodyOverflow = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (activeModalsCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeModalsCount++;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  activeModalsCount = Math.max(0, activeModalsCount - 1);
  if (activeModalsCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

/**
 * Contenedor Modal Accesible Universal para GAES.
 * Provee:
 * 1. Portal directo a document.body para evitar desfases causados por transformaciones de contenedores padre.
 * 2. Captura y ciclado de foco estricto (Focus Trap accesible WCAG 2.1 AA).
 * 3. Cierre accesible mediante tecla Escape con e.stopPropagation().
 * 4. Bloqueo seguro de scroll en el elemento body con conteo de modales activos.
 * 5. Soporte para scroll vertical independiente con `overflow-y-auto` y `my-auto` para evitar recortes.
 * 6. Atributos semánticos universales: role="dialog", aria-modal="true", aria-labelledby / aria-label.
 * 7. Restauración automática del foco al elemento desencadenador tras cerrar el modal.
 */
export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen = true,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  className = '',
  role = 'dialog',
  closeOnEscape = true,
  closeOnBackdropClick = true,
  initialFocusRef,
  preventScroll = true,
  id
}) => {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 1. Bloquear desplazamiento del body mientras el diálogo esté activo con ref-count seguro
  useEffect(() => {
    if (!preventScroll || !isOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [preventScroll, isOpen]);

  // 2. Guardar elemento activo previo y enfocar primer elemento del modal
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const timer = setTimeout(() => {
      if (!overlayRef.current) return;

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      // Priorizar elemento con atributo autofocus nativo
      const autoFocusEl = overlayRef.current.querySelector<HTMLElement>('[autofocus]');
      if (autoFocusEl) {
        autoFocusEl.focus();
        return;
      }

      // Enfocar el primer elemento interactivo
      const focusables = getFocusableElements(overlayRef.current);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        overlayRef.current.focus();
      }
    }, 40);

    return () => {
      clearTimeout(timer);
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        try {
          previouslyFocusedElementRef.current.focus();
        } catch {
          // Ignorar si el elemento previo ya no existe en el DOM
        }
      }
    };
  }, [isOpen, initialFocusRef]);

  // 3. Listener de teclado: Escape y Focus Trap (Tab / Shift+Tab)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!overlayRef.current || !isOpen) return;

      // Cierre con Escape
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // Captura y ciclado de foco con Tab
      if (e.key === 'Tab') {
        const focusables = getFocusableElements(overlayRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // Navegación hacia atrás (Shift + Tab)
          if (document.activeElement === firstElement || !overlayRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Navegación hacia adelante (Tab)
          if (document.activeElement === lastElement || !overlayRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // 4. Manejador de clic en el backdrop / overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  // Auto-asegurar `my-auto` en el hijo principal para centrado vertical seguro sin recorte de scroll
  const renderedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement<React.HTMLAttributes<HTMLElement>>(child)) {
      const existingClass = child.props.className || '';
      if (!existingClass.includes('my-auto')) {
        return React.cloneElement(child, {
          className: `${existingClass} my-auto`.trim()
        });
      }
    }
    return child;
  });

  return createPortal(
    <div
      ref={overlayRef}
      id={id}
      role={role}
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-label={!ariaLabelledBy ? ariaLabel : undefined}
      aria-describedby={ariaDescribedBy}
      tabIndex={-1}
      onClick={handleOverlayClick}
      style={{ zIndex: 9999 }}
      className={`fixed inset-0 overflow-y-auto bg-slate-900/75 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200 flex justify-center items-center p-2 sm:p-4 md:p-6 outline-none ${className}`}
    >
      {renderedChildren}
    </div>,
    document.body
  );
};
