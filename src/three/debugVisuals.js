import {
  AxesHelper,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { makeLabel } from "./labelSprite";

function signedAngleOnPlane(from, to, planeNormal) {
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

function createLine2(color, defaultWidth = 4) {
  const material = new LineMaterial({
    color,
    transparent: true,
    opacity: 0.98,
    depthTest: false,
    linewidth: defaultWidth,
    worldUnits: false,
  });
  return new Line2(new LineGeometry(), material);
}

function createGoniometerVisual(group, color) {
  const fixedRay = createLine2(color, 4);
  const movingRay = createLine2(color, 4);
  const angleArc = createLine2(color, 4);
  fixedRay.renderOrder = 1001;
  movingRay.renderOrder = 1001;
  angleArc.renderOrder = 1001;
  group.add(fixedRay, movingRay, angleArc);

  const setResolution = ({ width, height } = {}) => {
    const safeW = Math.max(1, Number(width) || 1);
    const safeH = Math.max(1, Number(height) || 1);
    [fixedRay, movingRay, angleArc].forEach(line => {
      line.material.resolution.set(safeW, safeH);
    });
  };

  const setLineWidth = px => {
    const width = Math.max(1, Number(px) || 4);
    [fixedRay, movingRay, angleArc].forEach(line => {
      line.material.linewidth = width;
      line.material.needsUpdate = true;
    });
  };

  const hide = () => {
    fixedRay.visible = false;
    movingRay.visible = false;
    angleArc.visible = false;
  };

  const setPoints = (line, points) => {
    if (!Array.isArray(points) || points.length < 2) {
      line.visible = false;
      return;
    }
    const arr = [];
    points.forEach(p => arr.push(p.x, p.y, p.z));
    if (arr.length < 6) {
      line.visible = false;
      return;
    }
    line.geometry.setPositions(arr);
    line.computeLineDistances();
    line.visible = true;
  };

  const setGoniometer = input => {
    if (!input || !input.fixedDir || !input.movingDir || !input.planeNormal) {
      hide();
      return;
    }

    const {
      fixedDir,
      movingDir,
      planeNormal,
      rayLength = 18,
      arcRadius = 10,
      segments = 28,
      viewport,
      lineWidthPx = 4,
    } = input;

    setResolution(viewport);
    setLineWidth(lineWidthPx);

    const normal = planeNormal.clone().normalize();
    const fixed = fixedDir.clone().normalize();
    const moving = movingDir.clone().normalize();
    if (normal.lengthSq() < 1e-8 || fixed.lengthSq() < 1e-8 || moving.lengthSq() < 1e-8) {
      hide();
      return;
    }

    setPoints(fixedRay, [new Vector3(0, 0, 0), fixed.clone().multiplyScalar(rayLength)]);
    setPoints(movingRay, [new Vector3(0, 0, 0), moving.clone().multiplyScalar(rayLength)]);

    const angle = signedAngleOnPlane(fixed, moving, normal);
    const basisU = fixed.clone();
    const basisV = new Vector3().crossVectors(normal, basisU).normalize();
    if (basisV.lengthSq() < 1e-8) {
      angleArc.visible = false;
      return;
    }

    const pts = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = angle * (i / segments);
      const point = basisU
        .clone()
        .multiplyScalar(Math.cos(t))
        .add(basisV.clone().multiplyScalar(Math.sin(t)))
        .multiplyScalar(arcRadius);
      pts.push(point);
    }
    setPoints(angleArc, pts);
  };

  hide();

  return {
    fixedRay,
    movingRay,
    angleArc,
    setGoniometer,
    setResolution,
    hide,
  };
}

function createOppositionReferenceVisual(group, color) {
  const trail = createLine2(color, 4.5);
  trail.renderOrder = 1001;
  group.add(trail);

  const markerMaterial = new MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthTest: false });
  const targetMaterial = new MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.95, depthTest: false });
  const markers = Array.from({ length: 11 }, () => {
    const mesh = new Mesh(new SphereGeometry(0.6, 10, 10), markerMaterial.clone());
    mesh.renderOrder = 1002;
    group.add(mesh);
    return mesh;
  });
  const target = new Mesh(new SphereGeometry(0.95, 14, 14), targetMaterial);
  target.renderOrder = 1003;
  group.add(target);

  const hide = () => {
    trail.visible = false;
    markers.forEach(marker => {
      marker.visible = false;
    });
    target.visible = false;
  };

  const setResolution = ({ width, height } = {}) => {
    const safeW = Math.max(1, Number(width) || 1);
    const safeH = Math.max(1, Number(height) || 1);
    trail.material.resolution.set(safeW, safeH);
  };

  const setLineWidth = px => {
    const width = Math.max(1, Number(px) || 4.5);
    trail.material.linewidth = width;
    trail.material.needsUpdate = true;
  };

  const setReference = input => {
    if (!input?.points || input.points.length < 2) {
      hide();
      return;
    }

    const points = input.points;
    setResolution(input.viewport);
    setLineWidth(input.lineWidthPx);
    const positions = [];
    points.forEach(point => positions.push(point.x, point.y, point.z));
    trail.geometry.setPositions(positions);
    trail.computeLineDistances();
    trail.visible = true;

    const pointRadius = Math.max(0.35, Number(input.pointRadius) || 0.6);
    const targetRadius = Math.max(pointRadius * 1.25, Number(input.targetRadius) || 0.95);
    const targetIndex = Math.min(points.length - 1, Math.max(0, Math.round(Number(input.targetIndex) || 0)));

    markers.forEach((marker, index) => {
      const point = points[index];
      if (!point) {
        marker.visible = false;
        return;
      }
      marker.position.copy(point);
      marker.scale.setScalar(pointRadius / 0.6);
      marker.visible = true;
      marker.material.opacity = index === targetIndex ? 0.8 : 0.42;
    });

    target.position.copy(points[targetIndex]);
    target.scale.setScalar(targetRadius / 0.95);
    target.visible = true;
  };

  hide();

  return {
    trail,
    markers,
    target,
    setReference,
    setResolution,
    hide,
  };
}

function createLabelHandle(group, sy, labelText, withLabel) {
  if (!withLabel) return { label: null, setLabelPosition: () => {} };

  const label = makeLabel(labelText);
  const defaultPos = new Vector3(0, sy * 0.72, 0);
  label.position.copy(defaultPos);
  group.add(label);

  const setLabelPosition = pos => {
    if (!label) return;
    if (!pos) {
      label.position.copy(defaultPos);
      return;
    }
    label.position.copy(pos);
  };

  return { label, setLabelPosition };
}

export function makeDebugPkg(group, key, planeAxis, sx, sy, axSz, labelText, withLabelOrOptions = true) {
  const opts =
    typeof withLabelOrOptions === "object" && withLabelOrOptions != null
      ? withLabelOrOptions
      : { withLabel: withLabelOrOptions };
  const withLabel = opts.withLabel !== false;
  const showPlane = opts.showPlane !== false;
  const withGoniometer = Boolean(opts.withGoniometer);
  const withOppositionReference = Boolean(opts.withOppositionReference);
  const goniometerColor = opts.goniometerColor ?? 0xff2b2b;
  const oppositionReferenceColor = opts.oppositionReferenceColor ?? 0xff2b2b;

  const axes = new AxesHelper(axSz);
  group.add(axes);

  const plane = new Mesh(
    new PlaneGeometry(sx, sy),
    new MeshBasicMaterial({
      color: 0x3bb7a2,
      transparent: true,
      opacity: 0.22,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  if (planeAxis === "YZ") plane.rotation.y = Math.PI / 2;
  if (planeAxis === "ZX") plane.rotation.x = Math.PI / 2;
  group.add(plane);

  const labelHandle = createLabelHandle(group, sy, labelText, withLabel);
  const goniometer = withGoniometer ? createGoniometerVisual(group, goniometerColor) : null;
  const oppositionReference = withOppositionReference ? createOppositionReferenceVisual(group, oppositionReferenceColor) : null;

  const setVisible = v => {
    axes.visible = v;
    plane.visible = v && showPlane;
    if (labelHandle.label) labelHandle.label.visible = v;
    if (goniometer && !v) goniometer.hide();
    if (oppositionReference && !v) oppositionReference.hide();
  };

  setVisible(false);

  return {
    key,
    axes,
    plane,
    label: labelHandle.label,
    fixedRay: goniometer?.fixedRay ?? null,
    movingRay: goniometer?.movingRay ?? null,
    angleArc: goniometer?.angleArc ?? null,
    oppositionTrail: oppositionReference?.trail ?? null,
    oppositionTarget: oppositionReference?.target ?? null,
    setGoniometer: goniometer?.setGoniometer ?? (() => {}),
    setGoniometerResolution: goniometer?.setResolution ?? (() => {}),
    setOppositionReference: oppositionReference?.setReference ?? (() => {}),
    setOppositionReferenceResolution: oppositionReference?.setResolution ?? (() => {}),
    setLabelPosition: labelHandle.setLabelPosition,
    setVisible,
  };
}

