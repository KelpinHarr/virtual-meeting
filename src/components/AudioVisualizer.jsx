import { useEffect, useRef, useState } from 'react';

export default function AudioVisualizer({ stream, label = 'Audio', color = 'bg-primary-600' }) {
  const [bars, setBars] = useState(new Array(16).fill(0));
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const contextRef = useRef(null);

  useEffect(() => {
    if (!stream) {
      setBars(new Array(16).fill(0));
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const ctx = new AudioContext();
    contextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      const newBars = Array.from(dataArray.slice(0, 16)).map(
        (v) => v / 255
      );
      setBars(newBars);
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      ctx.close();
    };
  }, [stream]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-end gap-1 h-9">
        {bars.map((v, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${color}`}
            style={{ height: `${Math.max(3, v * 36)}px`, opacity: 0.3 + v * 0.7 }}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-navy-700">{label}</span>
    </div>
  );
}
