import { Quaternion, Vector3 } from "three";

export function projectOnPlane(vector, planeNormal) {
  const normal = planeNormal.clone().normalize();
  return vector.clone().sub(normal.multiplyScalar(vector.dot(normal)));
}

export function toNodeLocalVector(node, worldVector) {
  const quaternion = node.getWorldQuaternion(new Quaternion());
  const inverse = quaternion.clone().invert();
  return worldVector.clone().applyQuaternion(inverse);
}

export function signedAngleOnPlane(from, to, planeNormal) {
  const fromLen = from.length();
  const toLen = to.length();
  if (fromLen < 1e-6 || toLen < 1e-6) return 0;
  const fromUnit = from.clone().multiplyScalar(1 / fromLen);
  const toUnit = to.clone().multiplyScalar(1 / toLen);
  const angle = fromUnit.angleTo(toUnit);
  const cross = new Vector3().crossVectors(fromUnit, toUnit);
  const sign = Math.sign(cross.dot(planeNormal)) || 1;
  return angle * sign;
}

export function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function pointToSegmentDistance(point, segA, segB) {
  const ab = segB.clone().sub(segA);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-8) return point.distanceTo(segA);
  const t = clamp01(point.clone().sub(segA).dot(ab) / abLenSq);
  const projection = segA.clone().add(ab.multiplyScalar(t));
  return point.distanceTo(projection);
}

export function rotateAroundAxis(vector, axis, radians) {
  const q = new Quaternion().setFromAxisAngle(axis.clone().normalize(), radians);
  return vector.clone().applyQuaternion(q);
}

export function ensureProjectedUnit(vector, planeNormal, fallback) {
  const projected = projectOnPlane(vector, planeNormal);
  if (projected.lengthSq() < 1e-8) return fallback.clone();
  return projected.normalize();
}

export function buildGoniometerSegments({ fixedDir, movingDir, planeNormal, rayLength, arcRadius }) {
  const fixed = fixedDir.clone().normalize();
  const moving = movingDir.clone().normalize();
  const normal = planeNormal.clone().normalize();

  const origin = new Vector3(0, 0, 0);
  const fixedEnd = fixed.clone().multiplyScalar(rayLength);
  const movingEnd = moving.clone().multiplyScalar(rayLength);

  const segments = [
    [origin, fixedEnd],
    [origin, movingEnd],
  ];

  const angle = signedAngleOnPlane(fixed, moving, normal);
  const basisU = fixed.clone();
  const basisV = new Vector3().crossVectors(normal, basisU).normalize();
  if (basisV.lengthSq() < 1e-8) return segments;

  const samples = 10;
  let prev = basisU.clone().multiplyScalar(arcRadius);
  for (let i = 1; i <= samples; i += 1) {
    const t = angle * (i / samples);
    const point = basisU
      .clone()
      .multiplyScalar(Math.cos(t))
      .add(basisV.clone().multiplyScalar(Math.sin(t)))
      .multiplyScalar(arcRadius);
    segments.push([prev, point]);
    prev = point;
  }

  return segments;
}
