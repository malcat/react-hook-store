//
// Standard

interface Window {}

//
// JSX

namespace JSX {
  type Component = (props?: any) => JSX.Element

  interface ElementChildrenAttribute {
    children?: any
  }
}
