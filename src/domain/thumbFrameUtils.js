import { Quaternion, Vector3 } from "three";

export function toPalmFrameVector(palm, vectorWorld) {
  const qPalm = palm.getWorldQuaternion(new Quaternion());
  return vectorWorld.clone().applyQuaternion(qPalm.invert());
}

export function toPalmFramePoint(palm, pointWorld, originWorld = new Vector3()) {
  const qPalm = palm.getWorldQuaternion(new Quaternion());
  return pointWorld.clone().sub(originWorld).applyQuaternion(qPalm.invert());
}

export function getPalmFrameAxes(palm) {
  const qPalm = palm.getWorldQuaternion(new Quaternion());
  return {
    uDistal: new Vector3(1, 0, 0).applyQuaternion(qPalm),
    vNormal: new Vector3(0, 1, 0).applyQuaternion(qPalm),
    wTransverse: new Vector3(0, 0, 1).applyQuaternion(qPalm),
  };
}

