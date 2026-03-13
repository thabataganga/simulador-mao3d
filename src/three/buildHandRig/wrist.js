import { Box3, Group, Mesh, SphereGeometry, Vector3 } from "three";
import { matArm, matPalm } from "./shared";

export function buildWristSubsystem(f) {
  const root = new Group();
  const { d, mkCyl, mkBox, addHL } = f;
  const clear = Math.max(0.5, 0.1 * d.palm.THICKNESS);

  const forearm = mkCyl(d.forearm.radDist, d.forearm.radProx, d.forearm.len, matArm);
  forearm.rotation.z = Math.PI / 2;

  const wristLenProx = d.wrist.length * 0.55;
  const wristProx = mkCyl(d.wrist.radius, d.wrist.radius, wristLenProx, matArm);
  wristProx.rotation.z = Math.PI / 2;

  const wristCov = new Mesh(new SphereGeometry(d.wrist.radius, 24, 18), matArm);
  const palm = addHL(mkBox(d.palm.LENGTH, d.palm.THICKNESS, d.palm.WIDTH, matPalm.clone()));

  const pivX = -d.palm.LENGTH / 2;
  const wristDev = new Group();
  wristDev.position.set(pivX, 0, 0);
  const wristFlex = new Group();
  wristDev.add(wristFlex);

  palm.position.set(d.palm.LENGTH / 2, 0, 0);
  wristCov.position.set(-clear * 0.6, 0, 0);
  wristFlex.add(wristCov, palm);

  wristProx.position.set(pivX - (clear + wristLenProx / 2), 0, 0);
  forearm.position.set(pivX - (clear + wristLenProx + clear + d.forearm.len / 2), 0, 0);
  root.add(forearm, wristProx, wristDev);

  root.rotation.z = Math.PI / 2;
  root.updateMatrixWorld(true);
  const bb = new Box3().setFromObject(root);
  const bc = new Vector3();
  bb.getCenter(bc);
  root.position.x -= bc.x;
  root.position.z -= bc.z;
  root.position.y -= bb.min.y;

  return { root, palm, wristDev, wristFlex };
}
