/* eslint-disable */
import React from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      torusGeometry: any;
      meshBasicMaterial: any;
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      spotLight: any;
      ambientLight: any;
      pointLight: any;
    }
  }
}
