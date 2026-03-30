import 'preact';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [tagName: string]: any;
    }
  }
}

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      [tagName: string]: any;
    }
  }
}

declare module 'preact/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      [tagName: string]: any;
    }
  }
}
