"""
100% Standard-Compliant QR Code Engine for LMS Cô Linh
Pure Python 3 Standard Library - Zero external dependencies.
Conforms strictly to ISO/IEC 18004:2015.
Generates razor-sharp, mathematically verified QR codes with 4-module Quiet Zone.
"""

# Galois Field GF(256) tables with primitive polynomial 0x11D (285)
EXP_TABLE = [0] * 512
LOG_TABLE = [0] * 256
_x = 1
for _i in range(255):
    EXP_TABLE[_i] = _x
    EXP_TABLE[_i + 255] = _x
    LOG_TABLE[_x] = _i
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D

def _gf_mul(x, y):
    if x == 0 or y == 0:
        return 0
    return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]

def _rs_generator_poly(ec_len):
    poly = [1]
    for i in range(ec_len):
        p2 = [1, EXP_TABLE[i]]
        new_poly = [0] * (len(poly) + 1)
        for j in range(len(poly)):
            for k in range(len(p2)):
                new_poly[j + k] ^= _gf_mul(poly[j], p2[k])
        poly = new_poly
    return poly

def _rs_encode(data, ec_len):
    gen = _rs_generator_poly(ec_len)
    msg = list(data) + [0] * ec_len
    for i in range(len(data)):
        coef = msg[i]
        if coef != 0:
            for j in range(len(gen)):
                msg[i + j] ^= _gf_mul(gen[j], coef)
    return msg[len(data):]

# Format information BCH(15, 5) constants
FORMAT_MASK = 0x5412
FORMAT_GENERATOR = 0x537

def _get_format_bits(ec_level_bits, mask_idx):
    data = (ec_level_bits << 3) | mask_idx
    d = data << 10
    while d.bit_length() >= 11:
        d ^= FORMAT_GENERATOR << (d.bit_length() - 11)
    return ((data << 10) | d) ^ FORMAT_MASK

# Mask formulas (0..7)
def _get_mask(mask_idx, r, c):
    if mask_idx == 0: return (r + c) % 2 == 0
    if mask_idx == 1: return r % 2 == 0
    if mask_idx == 2: return c % 3 == 0
    if mask_idx == 3: return (r + c) % 3 == 0
    if mask_idx == 4: return (r // 2 + c // 3) % 2 == 0
    if mask_idx == 5: return ((r * c) % 2) + ((r * c) % 3) == 0
    if mask_idx == 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 == 0
    if mask_idx == 7: return (((r * c) % 3) + ((r + c) % 2)) % 2 == 0
    return False

# ISO/IEC 18004 Penalty Score calculation
def _calculate_penalty(grid, size):
    penalty = 0
    # Rule 1: 5 or more consecutive modules of same color in rows / columns
    for r in range(size):
        run = 1
        for c in range(1, size):
            if grid[r][c] == grid[r][c - 1]:
                run += 1
            else:
                if run >= 5: penalty += 3 + (run - 5)
                run = 1
        if run >= 5: penalty += 3 + (run - 5)

    for c in range(size):
        run = 1
        for r in range(1, size):
            if grid[r][c] == grid[r - 1][c]:
                run += 1
            else:
                if run >= 5: penalty += 3 + (run - 5)
                run = 1
        if run >= 5: penalty += 3 + (run - 5)

    # Rule 2: 2x2 blocks of same color
    for r in range(size - 1):
        for c in range(size - 1):
            val = grid[r][c]
            if val == grid[r + 1][c] == grid[r][c + 1] == grid[r + 1][c + 1]:
                penalty += 3

    # Rule 3: 1:1:3:1:1 pattern detector
    p1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
    p2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
    for r in range(size):
        row = grid[r]
        for c in range(size - 10):
            sub = row[c:c+11]
            if sub == p1 or sub == p2:
                penalty += 40
    for c in range(size):
        col = [grid[r][c] for r in range(size)]
        for r in range(size - 10):
            sub = col[r:r+11]
            if sub == p1 or sub == p2:
                penalty += 40

    # Rule 4: Proportion of dark modules
    total = size * size
    dark = sum(grid[r][c] for r in range(size) for c in range(size))
    percent = (dark * 100) // total
    k = abs(percent - 50) // 5
    penalty += k * 10

    return penalty

# Version Specifications for Error Correction Level M (15% correction)
# (version: (total_codewords, data_codewords, ec_codewords, num_blocks))
VERSION_SPECS_M = {
    1: (26, 16, 10, 1),
    2: (44, 28, 16, 1),
    3: (70, 44, 26, 1),
    4: (100, 64, 36, 2),
}

# Alignment Pattern coordinates
ALIGN_COORDS = {
    1: [],
    2: [6, 18],
    3: [6, 22],
    4: [6, 26],
}

def generate_qr_matrix(text: str, error_level="M"):
    """
    Generates a 100% ISO/IEC 18004 compliant QR matrix.
    Returns: (grid, size, mask_index)
    grid is a 2D list of 0s and 1s (size x size).
    """
    data = text.encode("utf-8")

    # Select optimal version (1 is ideal for student IDs like HS01..HS29)
    version = 1
    if len(data) > 14:
        version = 2
    if len(data) > 26:
        version = 3
    if len(data) > 42:
        version = 4
    if len(data) > 62:
        raise ValueError(f"Text too long for micro-engine ({len(data)} bytes). Max 62 bytes.")

    spec = VERSION_SPECS_M[version]
    total_cw, data_cw, ec_cw, num_blocks = spec

    # 1. Encode bit stream (Byte mode = 0100)
    bits = []
    def put_bits(val, length):
        for i in range(length - 1, -1, -1):
            bits.append((val >> i) & 1)

    put_bits(4, 4) # Byte mode indicator
    put_bits(len(data), 8) # Character count (8 bits for versions 1..9)
    for b in data:
        put_bits(b, 8)

    # Terminator (up to 4 zeroes)
    term_len = min(4, data_cw * 8 - len(bits))
    put_bits(0, term_len)

    # Pad to byte boundary
    while len(bits) % 8 != 0:
        bits.append(0)

    # Convert to data codewords
    cw = []
    for i in range(0, len(bits), 8):
        b = 0
        for j in range(8):
            b = (b << 1) | bits[i + j]
        cw.append(b)

    # Pad codewords alternating 0xEC and 0x11
    pad_bytes = [0xEC, 0x11]
    p_idx = 0
    while len(cw) < data_cw:
        cw.append(pad_bytes[p_idx % 2])
        p_idx += 1

    # RS Error Correction blocks
    if num_blocks == 1:
        ec = _rs_encode(cw, ec_cw)
        all_codewords = cw + ec
    else:
        # Interleaved blocks
        block_len = data_cw // num_blocks
        ec_len = ec_cw // num_blocks
        blocks_data = [cw[i * block_len:(i + 1) * block_len] for i in range(num_blocks)]
        blocks_ec = [_rs_encode(b, ec_len) for b in blocks_data]
        all_codewords = []
        for i in range(block_len):
            for b in blocks_data:
                all_codewords.append(b[i])
        for i in range(ec_len):
            for e in blocks_ec:
                all_codewords.append(e[i])

    all_bits = []
    for byte in all_codewords:
        for i in range(7, -1, -1):
            all_bits.append((byte >> i) & 1)

    # 2. Build Matrix
    size = 17 + 4 * version
    grid = [[None] * size for _ in range(size)]
    is_function = [[False] * size for _ in range(size)]

    # Finder patterns + 1-module separators
    def place_finder(r_start, c_start):
        for r in range(-1, 8):
            for c in range(-1, 8):
                rf = r_start + r
                cf = c_start + c
                if 0 <= rf < size and 0 <= cf < size:
                    is_function[rf][cf] = True
                    if 0 <= r <= 6 and 0 <= c <= 6:
                        if (r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4)):
                            grid[rf][cf] = 1
                        else:
                            grid[rf][cf] = 0
                    else:
                        grid[rf][cf] = 0

    place_finder(0, 0)
    place_finder(0, size - 7)
    place_finder(size - 7, 0)

    # Alignment patterns for version >= 2
    if version >= 2:
        coords = ALIGN_COORDS[version]
        for ar in coords:
            for ac in coords:
                # Skip if overlapping finders
                if (ar < 9 and ac < 9) or (ar < 9 and ac > size - 9) or (ar > size - 9 and ac < 9):
                    continue
                for r in range(-2, 3):
                    for c in range(-2, 3):
                        rf = ar + r
                        cf = ac + c
                        is_function[rf][cf] = True
                        if abs(r) == 2 or abs(c) == 2 or (r == 0 and c == 0):
                            grid[rf][cf] = 1
                        else:
                            grid[rf][cf] = 0

    # Timing patterns
    for i in range(8, size - 8):
        if not is_function[6][i]:
            is_function[6][i] = True
            grid[6][i] = 1 if i % 2 == 0 else 0
        if not is_function[i][6]:
            is_function[i][6] = True
            grid[i][6] = 1 if i % 2 == 0 else 0

    # Dark module
    dark_r = 4 * version + 9
    is_function[dark_r][8] = True
    grid[dark_r][8] = 1

    # Format info coordinates
    format_coords_1 = [
        (8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5),
        (8, 7), (8, 8), (7, 8), (5, 8), (4, 8), (3, 8),
        (2, 8), (1, 8), (0, 8)
    ]
    format_coords_2 = [
        (size - 1, 8), (size - 2, 8), (size - 3, 8), (size - 4, 8),
        (size - 5, 8), (size - 6, 8), (size - 7, 8),
        (8, size - 8), (8, size - 7), (8, size - 6), (8, size - 5),
        (8, size - 4), (8, size - 3), (8, size - 2), (8, size - 1)
    ]
    for r, c in format_coords_1 + format_coords_2:
        is_function[r][c] = True

    # 3. Zigzag placement of data bits
    raw_data_grid = [row[:] for row in grid]
    bit_idx = 0
    c = size - 1
    up = True
    while c > 0:
        if c == 6:
            c -= 1
        rows = range(size - 1, -1, -1) if up else range(size)
        for r in rows:
            for cc in (c, c - 1):
                if not is_function[r][cc]:
                    if bit_idx < len(all_bits):
                        raw_data_grid[r][cc] = all_bits[bit_idx]
                        bit_idx += 1
                    else:
                        raw_data_grid[r][cc] = 0
        c -= 2
        up = not up

    # 4. Mask Evaluation (Test all 8 masks, choose lowest penalty)
    best_mask = 0
    best_penalty = float("inf")
    best_grid = None

    ec_level_bits = 0 # Level M = 00
    for mask_idx in range(8):
        cand_grid = [row[:] for row in raw_data_grid]
        for r in range(size):
            for cc in range(size):
                if not is_function[r][cc]:
                    if _get_mask(mask_idx, r, cc):
                        cand_grid[r][cc] ^= 1

        # Place format info bits
        fb = _get_format_bits(ec_level_bits, mask_idx)
        for i in range(15):
            bit = (fb >> (14 - i)) & 1
            r1, c1 = format_coords_1[i]
            cand_grid[r1][c1] = bit
            r2, c2 = format_coords_2[i]
            cand_grid[r2][c2] = bit

        pen = _calculate_penalty(cand_grid, size)
        if pen < best_penalty:
            best_penalty = pen
            best_mask = mask_idx
            best_grid = cand_grid

    return best_grid, size, best_mask

def generate_qr_svg(text: str, margin=4, size_px=None) -> str:
    """
    Generates a 100% standard vector SVG with standard 4-module Quiet Zone.
    Uses shape-rendering="crispEdges" and merges adjacent modules for maximum speed.
    """
    grid, size, _ = generate_qr_matrix(text)
    total_size = size + margin * 2

    # Merge adjacent horizontal modules in each row for clean, compact SVG
    rects = []
    for r in range(size):
        c = 0
        while c < size:
            if grid[r][c] == 1:
                start = c
                while c < size and grid[r][c] == 1:
                    c += 1
                length = c - start
                rects.append(f'<rect x="{start + margin}" y="{r + margin}" width="{length}" height="1" fill="#000000"/>')
            else:
                c += 1

    dim_attr = f' width="{size_px}" height="{size_px}"' if size_px else ' width="100%" height="100%"'

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_size} {total_size}"{dim_attr} shape-rendering="crispEdges">\n'
        f'  <rect width="{total_size}" height="{total_size}" fill="#FFFFFF"/>\n  '
        + "\n  ".join(rects)
        + "\n</svg>"
    )
    return svg
