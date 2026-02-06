import { useState, useRef, useEffect } from 'react';
import { Pen, Type, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onSignatureChange: (signature: string | null) => void;
  width?: number;
  height?: number;
}

type SignatureMode = 'draw' | 'type';

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', class: 'font-dancing' },
  { name: 'Great Vibes', class: 'font-vibes' },
  { name: 'Satisfy', class: 'font-satisfy' },
];

export default function SignaturePad({
  onSignatureChange,
  width = 500,
  height = 200,
}: SignaturePadProps) {
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [selectedFont, setSelectedFont] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(2, 2);
    context.lineCap = 'round';
    context.strokeStyle = '#1a1a2e';
    context.lineWidth = 2;
    contextRef.current = context;

    clearCanvas();
  }, [width, height]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width / 2, canvas.height / 2);

    // Draw signature line
    context.strokeStyle = '#e5e7eb';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(20, height - 40);
    context.lineTo(width - 20, height - 40);
    context.stroke();

    // Reset stroke style
    context.strokeStyle = '#1a1a2e';
    context.lineWidth = 2;

    onSignatureChange(null);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    contextRef.current?.closePath();

    // Export signature
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const handleTypedSignature = (text: string) => {
    setTypedSignature(text);

    if (text.trim()) {
      // Create canvas for typed signature
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw signature line
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 40);
        ctx.lineTo(width - 20, height - 40);
        ctx.stroke();

        // Draw typed signature
        ctx.fillStyle = '#1a1a2e';
        ctx.font = `italic 48px ${SIGNATURE_FONTS[selectedFont].name}, cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, width / 2, height - 50);

        const dataUrl = canvas.toDataURL('image/png');
        onSignatureChange(dataUrl);
      }
    } else {
      onSignatureChange(null);
    }
  };

  const switchMode = (newMode: SignatureMode) => {
    setMode(newMode);
    if (newMode === 'draw') {
      clearCanvas();
      setTypedSignature('');
    } else {
      onSignatureChange(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => switchMode('draw')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            mode === 'draw'
              ? 'bg-designer-100 text-designer-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <Pen className="w-4 h-4" />
          Draw
        </button>
        <button
          type="button"
          onClick={() => switchMode('type')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            mode === 'type'
              ? 'bg-designer-100 text-designer-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          <Type className="w-4 h-4" />
          Type
        </button>
      </div>

      {mode === 'draw' ? (
        <div className="space-y-2">
          <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair touch-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Sign above the line using your mouse or finger
            </p>
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Font selection */}
          <div className="flex items-center gap-2">
            {SIGNATURE_FONTS.map((font, index) => (
              <button
                key={font.name}
                type="button"
                onClick={() => {
                  setSelectedFont(index);
                  if (typedSignature) {
                    handleTypedSignature(typedSignature);
                  }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-colors',
                  selectedFont === index
                    ? 'bg-designer-100 text-designer-700 ring-2 ring-designer-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                style={{ fontFamily: `${font.name}, cursive` }}
              >
                Aa
              </button>
            ))}
          </div>

          {/* Text input */}
          <input
            type="text"
            value={typedSignature}
            onChange={(e) => handleTypedSignature(e.target.value)}
            placeholder="Type your full name"
            className="input text-2xl italic"
            style={{ fontFamily: `${SIGNATURE_FONTS[selectedFont].name}, cursive` }}
          />

          {/* Preview */}
          {typedSignature && (
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="border-b border-gray-200 pb-4">
                <p
                  className="text-4xl text-center text-gray-900 italic"
                  style={{ fontFamily: `${SIGNATURE_FONTS[selectedFont].name}, cursive` }}
                >
                  {typedSignature}
                </p>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Signature Preview
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
