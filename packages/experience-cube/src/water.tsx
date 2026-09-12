import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";

export function Water({ reduced }: { reduced: boolean }) {
  const objects = useMemo(() => {
    const root = new T.Group();
    const time = { value: 0 };
    const caustics = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: { time },
      vertexShader:
        "varying vec2 uvWater; void main(){uvWater=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 uvWater; uniform float time;
        void main(){
          vec2 p=(uvWater-.5)*46.;
          vec2 q=p+vec2(sin(p.y*.61+time*.17),cos(p.x*.7-time*.14))*.8;
          float f=abs(sin(q.x*1.4+sin(q.y*1.2))+sin(q.y*1.6+cos(q.x*.93)));
          float light=pow(1.-smoothstep(.015,.24,f),3.);
          float fade=1.-smoothstep(.19,.51,length(uvWater-.5));
          gl_FragColor=vec4(.18,.53,.65,light*fade*.048);
        }`,
    });
    const planeGeometry = new T.PlaneGeometry(22, 22);
    const floor = new T.Mesh(planeGeometry, caustics);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.233;
    root.add(floor);
    const particles = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      particles[i * 3] = Math.sin(i * 127.13) * 6;
      particles[i * 3 + 1] = (i * 0.371) % 7;
      particles[i * 3 + 2] = Math.cos(i * 45.7) * 5 - 1;
    }
    const particleGeometry = new T.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new T.BufferAttribute(particles, 3),
    );
    const particleMaterial = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: { time },
      vertexShader:
        "uniform float time; varying float fade; void main(){vec3 p=position;p.y=mod(p.y+time*.025,7.);p.x+=sin(p.y+time*.07)*.12;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(18./-view.z,1.,3.);fade=.2+sin(position.x*42.)*.12;}",
      fragmentShader:
        "varying float fade;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.55,.78,.88,(1.-smoothstep(.1,.5,d))*fade);}",
    });
    root.add(new T.Points(particleGeometry, particleMaterial));
    return {
      root,
      time,
      dispose: () => {
        caustics.dispose();
        planeGeometry.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
      },
    };
  }, []);
  useEffect(() => () => objects.dispose(), [objects]);
  useFrame(({ clock }) => {
    if (!reduced) objects.time.value = clock.elapsedTime;
  });
  return <primitive object={objects.root} />;
}
