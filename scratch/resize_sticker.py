import os
from PIL import Image, ImageSequence

def resize_animated_webp(input_path, output_path, size=(512, 512)):
    print(f"Opening {input_path}...")
    im = Image.open(input_path)
    
    frames = []
    durations = []
    
    # Iterate through all frames
    for i, frame in enumerate(ImageSequence.Iterator(im)):
        # Make sure we copy the frame so it isn't overwritten/garbage collected
        frame_copy = frame.copy().convert("RGBA")
        resized = frame_copy.resize(size, Image.Resampling.LANCZOS)
        frames.append(resized)
        
        # Get duration for each frame
        duration = im.info.get('duration', 100) # default to 100ms if not specified
        durations.append(duration)
        
    print(f"Total frames: {len(frames)}")
    
    # Save the frames back as an animated webp
    frames[0].save(
        output_path, 
        save_all=True, 
        append_images=frames[1:], 
        loop=0, 
        duration=durations,
        disposal=2,
        optimize=True
    )
    
    # Check size
    out_size = os.path.getsize(output_path)
    print(f"Saved {output_path} (Size: {out_size / 1024:.2f} KB)")
    
    # Verify dimensions
    verification = Image.open(output_path)
    print(f"Verified dimensions: {verification.size}, Animated: {getattr(verification, 'is_animated', False)}")

if __name__ == "__main__":
    resize_animated_webp(
        "stiker_perro-ezgif.com-optiwebp.webp",
        "stiker_perro_512.webp"
    )
