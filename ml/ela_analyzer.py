import os
import sys
import numpy as np
from PIL import Image, ImageChops, ImageEnhance

def analyze_ela(file_path: str, quality: int = 90) -> dict:
    """
    Performs Error Level Analysis on the given document/image
    to detect potential digital manipulation or forgery.
    """
    
    if not os.path.exists(file_path):
        return {"success": False, "error": "File not found"}
        
    try:
        if file_path.lower().endswith(".pdf"):
            import pymupdf as fitz
            pdf = fitz.open(file_path)
            if len(pdf) == 0:
                return {"success": False, "error": "Empty PDF"}
            page = pdf[0]
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            original = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            pdf.close()
        else:
            original = Image.open(file_path).convert("RGB")
            
        # Create a temporary file to save the compressed version
        temp_filename = f"{file_path}_temp_ela.jpg"
        
        # Save at a known quality level
        original.save(temp_filename, "JPEG", quality=quality)
        
        # Load the compressed version
        compressed = Image.open(temp_filename)
        
        # Calculate the absolute difference between original and compressed
        diff = ImageChops.difference(original, compressed)
        
        # Clean up temporary file
        os.remove(temp_filename)
        
        # Calculate the extremas to find the maximum difference
        extrema = diff.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        
        if max_diff == 0:
            max_diff = 1
            
        # Enhance the difference image
        scale = 255.0 / max_diff
        enhanced_diff = ImageEnhance.Brightness(diff).enhance(scale)
        
        # Convert to numpy array for statistical analysis
        diff_array = np.array(enhanced_diff)
        
        # Calculate variance and mean of the error level
        # High variance in specific regions indicates manipulation
        # Spliced regions will have higher error levels than the background
        variance = np.var(diff_array)
        mean_error = np.mean(diff_array)
        
        # Normalize into a "forgery probability" score (0-100)
        # These thresholds are heuristic and would typically be tuned
        # High variance = more suspicious
        forgery_probability = min(100.0, max(0.0, (variance / 100.0) * 100))
        
        # Save ELA visual output for the viewer
        ela_output_path = f"{file_path}_ela.jpg"
        enhanced_diff.save(ela_output_path, "JPEG", quality=90)
        
        return {
            "success": True,
            "ela_score": float(forgery_probability),
            "variance": float(variance),
            "mean_error": float(mean_error),
            "ela_image_path": ela_output_path
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        res = analyze_ela(sys.argv[1])
        import json
        print(json.dumps(res, indent=2))
