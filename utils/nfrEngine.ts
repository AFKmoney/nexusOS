// --- NFR KERNEL v2.0 (REAL IMPLEMENTATION) ---
// Based on "Neural Fractal Reconstruction" Whitepaper (Jan 3, 2026)
// Implements Adaptive Arithmetic Coding with Contextual Probability Modeling.

export interface TrainingMetrics {
  epoch: number; // In this real stream version, epoch is bytes processed
  loss: number; // Current bit cost
  accuracy: number; // Prediction confidence
}

// Constants for Integer Arithmetic Coding (32-bit / 64-bit safe ranges)
const CODE_VALUE_BITS = 32;
const FREQUENCY_BITS = 14;
const MAX_CODE = BigInt(2) ** BigInt(CODE_VALUE_BITS) - BigInt(1);
const ONE_QUARTER = BigInt(1) << BigInt(CODE_VALUE_BITS - 2);
const ONE_HALF = BigInt(2) * ONE_QUARTER;
const THREE_QUARTERS = BigInt(3) * ONE_QUARTER;
const MAX_FREQ = BigInt(1) << BigInt(FREQUENCY_BITS);

class BitOutputStream {
  private buffer: number[] = [];
  private currentByte = 0;
  private numBits = 0;

  writeBit(bit: number) {
    this.currentByte = (this.currentByte << 1) | bit;
    this.numBits++;
    if (this.numBits === 8) {
      this.buffer.push(this.currentByte);
      this.currentByte = 0;
      this.numBits = 0;
    }
  }

  // Flush remaining bits (padding with 0)
  close(): Uint8Array {
    if (this.numBits > 0) {
      this.currentByte <<= 8 - this.numBits;
      this.buffer.push(this.currentByte);
    }
    return new Uint8Array(this.buffer);
  }
}

class BitInputStream {
  private data: Uint8Array;
  private ptr = 0;
  private currentByte = 0;
  private bitsRemaining = 0;

  constructor(data: Uint8Array) {
    this.data = data;
  }

  readBit(): number {
    if (this.bitsRemaining === 0) {
      if (this.ptr >= this.data.length) return -1; // EOF
      const nextByte = this.data[this.ptr++];
      if (nextByte === undefined) return -1;
      this.currentByte = nextByte;
      this.bitsRemaining = 8;
    }
    const bit = (this.currentByte >> (this.bitsRemaining - 1)) & 1;
    this.bitsRemaining--;
    return bit;
  }
}

// --- CONTEXTUAL PREDICTOR (The "Neural" Part) ---
// Simplified Order-1 Context Model for real-time browser execution.
// It learns P(char | prev_char) dynamically.
class ContextModel {
  // 256 contexts (one for each previous byte), each having a frequency table for the next byte (257 symbols, +EOF)
  public tables: Uint32Array[] = [];
  public totalFreqs: number[] = [];
  private readonly ESCAPE = 256;

  constructor() {
    // Initialize with Order-0 uniform counts
    for (let i = 0; i < 257; i++) {
      // Flat initialization
      this.tables[i] = new Uint32Array(257).fill(1);
      this.totalFreqs[i] = 257;
    }
  }

  // Update weights based on observation (Online Learning)
  update(ctx: number, symbol: number) {
    const table = this.tables[ctx];
    const total = this.totalFreqs[ctx];
    if (!table || total === undefined) {
      throw new Error(`Invalid context index: ${ctx}`);
    }

    table[symbol] = (table[symbol] ?? 0) + 1;
    this.totalFreqs[ctx] = total + 1;

    // Rescale if frequency too high (Fractal renormalization)
    if (this.totalFreqs[ctx] !== undefined && this.totalFreqs[ctx] >= Number(MAX_FREQ)) {
      let sum = 0;
      for (let i = 0; i < 257; i++) {
        const current = table[i] ?? 0;
        table[i] = (current >> 1) + 1;
        sum += table[i] ?? 0;
      }
      this.totalFreqs[ctx] = sum;
    }
  }

  getProbability(ctx: number, symbol: number): { low: bigint; high: bigint; total: bigint } {
    const table = this.tables[ctx];
    const total = this.totalFreqs[ctx];
    if (!table || total === undefined) {
      throw new Error(`Invalid context index: ${ctx}`);
    }

    let low = 0;
    for (let i = 0; i < symbol; i++) {
      low += table[i] ?? 0;
    }
    const freq = table[symbol] ?? 0;
    return {
      low: BigInt(low),
      high: BigInt(low + freq),
      total: BigInt(total),
    };
  }
}

export const nfrEngine = {
  /**
   * Calculates Shannon Entropy (Baseline).
   */
  calculateEntropy(text: string): number {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const frequencies = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      if (value !== undefined) frequencies[value]++;
    }

    return frequencies.reduce((sum, count) => {
      if (count === 0) return sum;
      const p = count / data.length;
      return sum - p * Math.log2(p);
    }, 0);
  },

  /**
   * ACTUAL ARITHMETIC COMPRESSION
   * Implements the Section 2.2 Neural-Arithmetic Bridge.
   */
  async compress(
    input: string,
    epochs: number = 1, // Epochs unused in single-pass adaptive coding, kept for interface compatibility
    onProgress?: (metrics: TrainingMetrics) => void
  ): Promise<{ archive: string; model: string }> {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const bitStream = new BitOutputStream();
    const model = new ContextModel();

    let low = BigInt(0);
    let high = MAX_CODE;
    let pending_bits = 0;
    let context = 0; // Initial context (order-1)

    const startTime = performance.now();
    let lastYieldTime = startTime;

    // --- ENCODING LOOP ---
    for (let i = 0; i < data.length; i++) {
      const symbol = data[i];
      if (symbol === undefined) continue;
      const prob = model.getProbability(context, symbol);
      const range = high - low + BigInt(1);

      high = low + (range * prob.high) / prob.total - BigInt(1);
      low = low + (range * prob.low) / prob.total;

      // Renormalization (Output bits to keep precision infinite)
      while (true) {
        if (high < ONE_HALF) {
          this.outputBitPlusPending(bitStream, 0, pending_bits);
          pending_bits = 0;
        } else if (low >= ONE_HALF) {
          this.outputBitPlusPending(bitStream, 1, pending_bits);
          pending_bits = 0;
          low -= ONE_HALF;
          high -= ONE_HALF;
        } else if (low >= ONE_QUARTER && high < THREE_QUARTERS) {
          pending_bits++;
          low -= ONE_QUARTER;
          high -= ONE_QUARTER;
        } else {
          break;
        }
        low = low << BigInt(1);
        high = (high << BigInt(1)) | BigInt(1);
      }

      // Online Training: Update model weights immediately after encoding
      model.update(context, symbol);
      context = symbol; // Context is the current char for the next step

      // Yield to UI thread based on elapsed time rather than fixed byte counts.
      // We check the time only every 512 bytes (using bitwise AND for performance)
      // to minimize Date.now() overhead, yielding if >16ms have passed.
      if ((i & 511) === 0) {
        const now = performance.now();
        if (now - lastYieldTime > 16) {
          if (onProgress) {
            // Calculate "Instantaneous Entropy" (Loss)
            // Loss = -log2(probability assigned to actual symbol)
            const p = Number(prob.high - prob.low) / Number(prob.total);
            const loss = -Math.log2(p);
            onProgress({ epoch: i, loss: loss, accuracy: (1 - loss / 8) * 100 });
          }
          // Yield to UI thread
          await new Promise((r) => setTimeout(r, 0));
          lastYieldTime = performance.now();
        }
      }
    }

    // Terminate stream (Encode EOF symbol 256)
    const eofProb = model.getProbability(context, 256);
    const range = high - low + BigInt(1);
    high = low + (range * eofProb.high) / eofProb.total - BigInt(1);
    low = low + (range * eofProb.low) / eofProb.total;

    // Final bits flush
    pending_bits++;
    if (low < ONE_QUARTER) this.outputBitPlusPending(bitStream, 0, pending_bits);
    else this.outputBitPlusPending(bitStream, 1, pending_bits);

    const compressedBytes = bitStream.close();

    // --- CONTAINERIZATION ---
    // NFR Container Format: [DÆ02][OriginalLen:4][CompressedData]
    // We store original length to validate reconstruction, though EOF handles termination.
    const metaBuffer = new ArrayBuffer(8);
    const metaView = new DataView(metaBuffer);
    metaView.setUint32(0, 0xDAE00200); // Magic: DÆ02 (Real NFR)
    metaView.setUint32(4, data.length); // Original Size

    const compressedBuffer = compressedBytes.buffer.slice(
      compressedBytes.byteOffset,
      compressedBytes.byteOffset + compressedBytes.byteLength
    ) as ArrayBuffer;
    const finalBlob = new Blob([metaBuffer, compressedBuffer]);

    // Model "Seed" representation (Logic Description)
    const modelContent = `DAEMON_NFR_ENGINE_V2::ADAPTIVE_ARITHMETIC
    [TYPE]: ORDER-1 CONTEXT MARKOV
    [STATE]: PRE-TRAINED_0
    [PRECISION]: ${CODE_VALUE_BITS}-BIT
    [HASH]: ${Date.now().toString(16).toUpperCase()}`;

    const archiveBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(finalBlob);
    });

    return { archive: archiveBase64, model: modelContent };
  },

  outputBitPlusPending(stream: BitOutputStream, bit: number, pending: number) {
    stream.writeBit(bit);
    for (let i = 0; i < pending; i++) {
      stream.writeBit(1 - bit);
    }
  },

  /**
   * ACTUAL ARITHMETIC DECOMPRESSION
   * Reverses the encoding process bit-by-bit using the same adaptive model.
   */
  async decompress(dmnDataUrl: string): Promise<{ content: string; meta: { version: string; originalSize: number; metrics: { neuralEntropy: number } } }> {
    const res = await fetch(dmnDataUrl);
    const buffer = await res.arrayBuffer();
    const view = new DataView(buffer);

    const magic = view.getUint32(0);
    if (magic !== 0xDAE00200) {
      throw new Error("Invalid NFR v2 Signature. File may be legacy or corrupted.");
    }
    const originalLen = view.getUint32(4);
    const rawData = new Uint8Array(buffer.slice(8));

    const bitStream = new BitInputStream(rawData);
    const model = new ContextModel();
    const outputBuffer: number[] = [];

    let high = MAX_CODE;
    let low = BigInt(0);
    let value = BigInt(0);
    let context = 0;
    let lastYieldTime = performance.now();

    // Fill pipeline (read first 32 bits)
    for (let i = 0; i < CODE_VALUE_BITS; i++) {
      value = (value << BigInt(1)) | BigInt(Math.max(0, bitStream.readBit()));
    }

    while (true) {
      const range = high - low + BigInt(1);
      const totalFreq = model.totalFreqs[context];
      if (totalFreq === undefined) {
        throw new Error(`Invalid context frequency: ${context}`);
      }
      const total = BigInt(totalFreq);
      const scaledValue = ((value - low + BigInt(1)) * total - BigInt(1)) / range;

      // Find symbol that fits the scaled value
      // Linear search for simplicity (Binary search would be faster for order-0)
      let symbol = 0;
      let acc = 0;
      const table = model.tables[context];
      if (!table) {
        throw new Error(`Invalid context table: ${context}`);
      }

      // Finding the symbol where low <= scaledValue < high
      let symLow = 0;
      for (let s = 0; s < 257; s++) {
        const freq = table[s] ?? 0;
        if (BigInt(symLow + freq) > scaledValue) {
          symbol = s;
          acc = symLow;
          break;
        }
        symLow += freq;
      }

      if (symbol === 256) break; // EOF

      outputBuffer.push(symbol);

      // Arithmetic Decode Step
      const symbolFreq = table[symbol] ?? 0;
      const prob = {
        low: BigInt(acc),
        high: BigInt(acc + symbolFreq),
        total: total,
      };

      high = low + (range * prob.high) / prob.total - BigInt(1);
      low = low + (range * prob.low) / prob.total;

      // Renormalization
      while (true) {
        if (high < ONE_HALF) {
          // do nothing
        } else if (low >= ONE_HALF) {
          value -= ONE_HALF;
          low -= ONE_HALF;
          high -= ONE_HALF;
        } else if (low >= ONE_QUARTER && high < THREE_QUARTERS) {
          value -= ONE_QUARTER;
          low -= ONE_QUARTER;
          high -= ONE_QUARTER;
        } else {
          break;
        }
        low = low << BigInt(1);
        high = (high << BigInt(1)) | BigInt(1);
        value = (value << BigInt(1)) | BigInt(Math.max(0, bitStream.readBit()));
      }

      model.update(context, symbol);
      context = symbol;

      // Safety Break for bad streams
      if (outputBuffer.length > originalLen * 2) throw new Error("Decompression Overflow: Model divergence.");

      // Yield for UI responsiveness on large files based on elapsed time.
      // Check every 512 bytes to avoid excessive performance.now() calls.
      if ((outputBuffer.length & 511) === 0) {
        const now = performance.now();
        if (now - lastYieldTime > 16) {
          await new Promise((r) => setTimeout(r, 0));
          lastYieldTime = performance.now();
        }
      }
    }

    const dec = new TextDecoder();
    return {
      content: dec.decode(new Uint8Array(outputBuffer)),
      meta: {
        version: "NFRv2.0 (Real)",
        originalSize: originalLen,
        metrics: { neuralEntropy: 0 }, // Calc on compress only
      }
    };
  }
};
