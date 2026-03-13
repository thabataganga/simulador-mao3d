import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

export const matArm = new MeshStandardMaterial({ color: 0xcad4e0, roughness: 0.8, metalness: 0.05 });
export const matPalm = new MeshStandardMaterial({ color: 0xdde6ee, roughness: 0.85, metalness: 0.03 });
export const matFinger = new MeshStandardMaterial({ color: 0xe9eef3, roughness: 0.9, metalness: 0.02 });

export function createFactories(d, hlList) {
  const mkCyl = (r1, r2, h, mat) => new Mesh(new CylinderGeometry(r1, r2, h, 24), mat);
  const mkBox = (lx, wy, wz, mat) => new Mesh(new BoxGeometry(lx, wy, wz), mat);
  const mkSphere = (r, mat) => new Mesh(new SphereGeometry(r, 16, 16), mat);
  const addHL = mesh => {
    mesh.userData.baseColor = mesh.material.color.clone();
    hlList.push(mesh);
    return mesh;
  };

  const mkPhal = (len, wid, mat) => {
    const group = new Group();
    const mesh = addHL(mkBox(len, wid, wid * 0.9, mat.clone()));
    group.add(mesh);
    return { group, mesh };
  };

  return { d, mkCyl, mkBox, mkSphere, mkPhal, addHL };
}

export function hasValidDims(d) {
  return Boolean(
    d?.palm?.LENGTH &&
      d?.palm?.WIDTH &&
      d?.palm?.THICKNESS &&
      d?.wrist?.radius != null &&
      d?.wrist?.length != null &&
      d?.forearm?.len != null &&
      d?.forearm?.radProx != null &&
      d?.forearm?.radDist != null &&
      Array.isArray(d?.fingers) &&
      d.fingers.length >= 4 &&
      d.fingers.every(finger => Array.isArray(finger?.len) && finger.len.length === 3) &&
      Array.isArray(d?.fingerWid) &&
      d.fingerWid.length >= 3 &&
      Array.isArray(d?.thumbLen) &&
      d.thumbLen.length >= 2 &&
      Array.isArray(d?.thumbWid) &&
      d.thumbWid.length >= 2
  );
}
