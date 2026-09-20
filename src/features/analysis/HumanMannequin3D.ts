import * as THREE from 'three';

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// Relasi segmen tulang anatomi tubuh
const BONE_CONNECTIONS: [number, number][] = [
  // Bahu
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  // Lengan kiri
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  // Lengan kanan
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  // Panggul
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Tungkai kiri
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  // Tungkai kanan (ekstremitas tendangan)
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
];

export class HumanMannequin3D {
  public group: THREE.Group;

  private boneMaterial: THREE.MeshStandardMaterial;
  private jointMaterial: THREE.MeshStandardMaterial;
  private headMaterial: THREE.MeshStandardMaterial;

  private headMesh: THREE.Mesh;
  private spineMesh: THREE.Mesh;
  private bones: THREE.Mesh[] = [];
  private joints: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();

    // Material putih bersih biomekanika
    this.boneMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    });

    this.jointMaterial = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.2,
      metalness: 0.3,
    });

    this.headMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
    });

    // 1. Kepala 3D
    const headGeo = new THREE.SphereGeometry(0.065, 20, 20);
    this.headMesh = new THREE.Mesh(headGeo, this.headMaterial);
    this.headMesh.scale.set(1.0, 1.25, 1.0);
    this.group.add(this.headMesh);

    // 2. Tulang belakang (spine)
    const spineGeo = new THREE.CylinderGeometry(0.016, 0.016, 1, 12);
    this.spineMesh = new THREE.Mesh(spineGeo, this.boneMaterial);
    this.group.add(this.spineMesh);

    // 3. Batang tulang segmen tubuh
    const baseCylinder = new THREE.CylinderGeometry(0.014, 0.014, 1, 12);
    BONE_CONNECTIONS.forEach(() => {
      const mesh = new THREE.Mesh(baseCylinder, this.boneMaterial);
      this.bones.push(mesh);
      this.group.add(mesh);
    });

    // 4. Sendi bola di setiap landmark kunci
    const baseSphere = new THREE.SphereGeometry(0.024, 16, 16);
    const trackedLandmarks = [
      POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
      POSE_LANDMARKS.LEFT_FOOT_INDEX, POSE_LANDMARKS.RIGHT_FOOT_INDEX,
    ];

    trackedLandmarks.forEach(() => {
      const mesh = new THREE.Mesh(baseSphere, this.jointMaterial);
      this.joints.push(mesh);
      this.group.add(mesh);
    });
  }

  private setBone(mesh: THREE.Mesh, p1: THREE.Vector3, p2: THREE.Vector3, thickness = 0.014): void {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const length = dir.length();

    if (length < 0.001) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    mesh.scale.set(thickness / 0.014, length, thickness / 0.014);

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const defaultAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(defaultAxis, dir.clone().normalize());
    mesh.quaternion.copy(quat);
  }

  public updatePose(
    landmarks: Landmark3D[] | null,
    to3DSpace: (lm: Landmark3D) => THREE.Vector3,
    _isImpactFrame: boolean = false,
    _kickingLeg: 'Kanan' | 'Kiri' = 'Kanan'
  ): void {
    if (!landmarks || landmarks.length < 33) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;

    const pts = landmarks.map((lm) => to3DSpace(lm));

    const nose = pts[POSE_LANDMARKS.NOSE];
    const lSh = pts[POSE_LANDMARKS.LEFT_SHOULDER];
    const rSh = pts[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lHip = pts[POSE_LANDMARKS.LEFT_HIP];
    const rHip = pts[POSE_LANDMARKS.RIGHT_HIP];

    const midShoulder = new THREE.Vector3().addVectors(lSh, rSh).multiplyScalar(0.5);
    const midHip = new THREE.Vector3().addVectors(lHip, rHip).multiplyScalar(0.5);

    // 1. Kepala
    const headTarget = nose.clone().add(new THREE.Vector3(0, 0.03, 0));
    this.headMesh.position.copy(headTarget);

    // 2. Spine
    this.setBone(this.spineMesh, midHip, midShoulder, 0.018);

    // 3. Batang tulang
    BONE_CONNECTIONS.forEach(([idxA, idxB], i) => {
      if (this.bones[i]) {
        const isLeg = idxA >= 23 || idxB >= 23;
        this.setBone(this.bones[i], pts[idxA], pts[idxB], isLeg ? 0.018 : 0.014);
      }
    });

    // 4. Sendi bola
    const trackedIndices = [
      POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW,
      POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
      POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
      POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
      POSE_LANDMARKS.LEFT_FOOT_INDEX, POSE_LANDMARKS.RIGHT_FOOT_INDEX,
    ];

    trackedIndices.forEach((lmIdx, i) => {
      if (this.joints[i]) {
        this.joints[i].position.copy(pts[lmIdx]);
      }
    });
  }

  public dispose(): void {
    this.boneMaterial.dispose();
    this.jointMaterial.dispose();
    this.headMaterial.dispose();
  }
}