import "preact";

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
