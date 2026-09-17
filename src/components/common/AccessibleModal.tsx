import React, { useEffect, useRef, useCallback } from 'react';

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
 * Contenedor Modal Accesible Universal para GAES.
 * Provee:
 * 1. Captura y ciclado de foco estricto (Focus Trap accesible WCAG 2.1 AA).
 * 2. Cierre accesible mediante tecla Escape con e.stopPropagation().
 * 3. Bloqueo de scroll en el elemento body mientras permanezca abierto.
 * 4. Atributos semánticos universales: role="dialog", aria-modal="true", aria-labelledby / aria-label.
 * 5. Restauración automática del foco al elemento desencadenador tras cerrar el modal.
 */
export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen = true,
  onClose,
  children,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200',
  role = 'dialog',
  closeOnEscape = true,
  closeOnBackdropClick = true,
  initialFocusRef,
  preventScroll = true,
  id
}) => {
  if (!isOpen) return null;

  const overlayRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // 1. Bloquear desplazamiento del body mientras el diálogo esté activo
  useEffect(() => {
    if (!preventScroll) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [preventScroll]);

  // 2. Guardar elemento activo previo y enfocar primer elemento del modal
  useEffect(() => {
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
  }, [initialFocusRef]);

  // 3. Listener de teclado: Escape y Focus Trap (Tab / Shift+Tab)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!overlayRef.current) return;

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
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 4. Manejador de clic en el backdrop / overlay
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
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
      className={`${className} outline-none`}
    >
      {children}
    </div>
  );
};
