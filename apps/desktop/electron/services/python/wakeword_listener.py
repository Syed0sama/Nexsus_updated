#!/usr/bin/env python3
"""
Persistent wake-word listener.

Reads raw 16kHz mono 16-bit PCM audio from stdin continuously for the
lifetime of the process, runs it through the custom "hey nexus"
OpenWakeWord model, and prints one JSON line to stdout whenever the
wake word is detected. Started ONCE by Node.js; runs forever.
"""

import sys
import json
import os
import numpy as np
from openwakeword.model import Model

CHUNK_SAMPLES = 1280  # 80ms at 16kHz — openWakeWord's expected frame size
BYTES_PER_SAMPLE = 2
CHUNK_BYTES = CHUNK_SAMPLES * BYTES_PER_SAMPLE
DETECTION_THRESHOLD = 0.02

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hey_nexus.onnx")


def main():
    model = Model(wakeword_model_paths=[MODEL_PATH])
    buffer = b""

    while True:
        chunk = sys.stdin.buffer.read(CHUNK_BYTES)

        if not chunk:
            break

        buffer += chunk

        while len(buffer) >= CHUNK_BYTES:
            frame = buffer[:CHUNK_BYTES]
            buffer = buffer[CHUNK_BYTES:]

            audio = np.frombuffer(frame, dtype=np.int16)
            predictions = model.predict(audio)

            for wakeword, score in predictions.items():
                if score > DETECTION_THRESHOLD:
                    print(json.dumps({"detected": True, "model": wakeword, "score": float(score)}), flush=True)


if __name__ == "__main__":
    main()