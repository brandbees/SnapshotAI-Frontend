export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Subscriber = (opts: ConfirmOptions | null) => void;

let _resolve: ((v: boolean) => void) | null = null;
const _subs = new Set<Subscriber>();

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((res) => {
    _resolve = res;
    _subs.forEach((fn) => fn(opts));
  });
}

export function _answer(v: boolean): void {
  _resolve?.(v);
  _resolve = null;
  _subs.forEach((fn) => fn(null));
}

export function _subscribe(fn: Subscriber): () => void {
  _subs.add(fn);
  return () => _subs.delete(fn);
}
