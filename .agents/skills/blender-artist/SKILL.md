---
name: blender-artist
description: Kỹ năng chuyên sâu về dựng hình 3D (Modeling), chất liệu PBR (Shading), ánh sáng studio (Lighting), thiết lập Camera và kết xuất hình ảnh/video chất lượng cao (Rendering) trong Blender 5.0+ thông qua Blender AI MCP Addon và Blender CLI.
---

# Kỹ Năng: Chuyên Viên Dựng Hình & Render 3D (Blender Artist)

Kỹ năng này cung cấp kiến thức, quy trình chuẩn và bộ công cụ tự động hóa để thực hiện mọi tác vụ dựng hình 3D và kết xuất (render) bằng Blender 5.0+.

---

## 1. Phương Thức Tương Tác với Blender

Có 2 phương thức hoạt động song song tùy theo trạng thái của ứng dụng Blender:

### Cách 1: Tương tác thời gian thực qua Blender AI MCP Addon (Khi Blender đang mở)
- **MCP Endpoint**: `http://127.0.0.1:9876/mcp` (Addon `mcp_for_blender_pro`).
- Các công cụ MCP có sẵn:
  - `get_scene_info()`: Tổng quan về scene, objects, camera, active render engine.
  - `list_objects(type_filter)`: Liệt kê danh sách vật thể (MESH, LIGHT, CAMERA, ...).
  - `get_object_info(name)`: Xem vị trí, góc xoay, kích thước, modifier, material của vật thể.
  - `add_cube`, `add_sphere`, `add_cylinder`, `add_plane`: Thêm khối hình cơ bản.
  - `add_light(name, type, energy, color, location)`: Thêm đèn (POINT, SUN, SPOT, AREA).
  - `add_camera(name, location, rotation, focal_length)`: Thêm và đặt thông số camera.
  - `move_object`, `duplicate_object`, `delete_object`, `parent_objects`: Thao tác vật thể.
  - `set_material(object_name, color, roughness, metallic, emission_color, emission_strength)`: Gán màu sắc và tính chất vật liệu Principled BSDF.
  - `viewport_screenshot(filepath, width, height)`: Chụp ảnh viewport nhanh để kiểm tra hình khối và bố cục.
  - `execute_code(code)`: **Cực kỳ mạnh mẽ** — chạy bất kỳ đoạn mã Python `bpy` nào trực tiếp vào ngữ cảnh scene đang mở của Blender!
  - `export_scene(filepath, format)`: Xuất file mô hình (`gltf`, `fbx`, `obj`, `stl`, `ply`).

### Cách 2: Thực thi ngầm / Batch rendering qua Blender CLI (Khi Blender đóng hoặc render nặng)
- Đường dẫn thực thi trên Windows:
  `C:\Program Files\Blender Foundation\Blender 5.0\blender.exe`
- Lệnh chạy script Python không cần giao diện:
  ```powershell
  & "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background --python <duong_dan_script.py>
  ```
- Lệnh render scene ra ảnh:
  ```powershell
  & "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe" --background <scene.blend> -o <output_dir>/render_###.png -F PNG -f 1
  ```

---

## 2. Helper Script Điều Khiển Nhanh

Trong thư mục `scripts/` có sẵn wrapper `blender-mcp-client.mjs` tự động chuyển đổi giữa MCP và CLI:
```bash
# Kiểm tra trạng thái kết nối
node .agents/skills/blender-artist/scripts/blender-mcp-client.mjs status

# Liệt kê danh sách tool MCP
node .agents/skills/blender-artist/scripts/blender-mcp-client.mjs list-tools

# Gọi tool MCP trực tiếp
node .agents/skills/blender-artist/scripts/blender-mcp-client.mjs call get_scene_info "{}"

# Thực thi đoạn code Python (tự dùng MCP nếu Blender mở, hoặc chạy headless CLI nếu Blender đóng)
node .agents/skills/blender-artist/scripts/blender-mcp-client.mjs exec "import bpy; bpy.ops.mesh.primitive_monkey_add(size=2)"

# Chạy một file script Python hoàn chỉnh
node .agents/skills/blender-artist/scripts/blender-mcp-client.mjs exec-file <duong_dan_file.py>
```

---

## 3. Quy Trình Dựng Hình & Render Tiêu Chuẩn

Khi nhận đề bài từ người dùng hoặc đồng nghiệp:

### Bước 1: Phân tích & Lên Kịch bản Khối (Geometry & Layout)
- Xác định tỷ lệ thực (Real-world scale, đơn vị Metric/Meters).
- Lựa chọn hình thái (Hard-surface, Organic, Architectural, Product).

### Bước 2: Dựng hình (Modeling)
- Tạo hình khối chính bằng primitive hoặc procedural code `bpy.ops.mesh.*` / bmesh.
- Luôn vát mép (Bevel modifier hoặc Bevel edge) cho các cạnh cứng để bắt sáng chân thực, tránh cạnh sắc nhọn phi thực tế.
- Thiết lập Shade Smooth hoặc Auto Smooth (`obj.data.use_auto_smooth = True` hoặc `bpy.ops.object.shade_smooth()`).

### Bước 3: Thiết lập Ánh sáng Studio (Lighting Setup)
- **Key Light**: Đèn chiếu chính (Area Light hoặc Sun), góc 45 độ, công suất mạnh nhất.
- **Fill Light**: Đèn làm mềm bóng đổ, góc đối diện Key Light, công suất 30-50% Key Light, sắc độ hơi dịu hoặc ám màu môi trường.
- **Rim / Back Light**: Đèn phía sau vật thể chiếu tới, làm nổi bật đường viền tách biệt khỏi phông nền.
- **World Environment**: Đặt màu nền tối ưu hoặc dùng shader HDRI cho phản chiếu kim loại/thủy tinh.

### Bước 4: Thiết lập Vật liệu Chân thực (PBR Shading)
- Sử dụng Principled BSDF node:
  - `Base Color`: Màu sắc chủ đạo.
  - `Roughness`: Độ nhám bề mặt (0.1 cho bóng láng, 0.4-0.6 cho nhựa/gỗ/da mịn, 0.8+ cho bê tông/đá).
  - `Metallic`: 1.0 cho kim loại hoàn toàn, 0.0 cho phi kim (dielectric).
  - `Specular` & `Normal`: Tạo vi cấu trúc và gợn sóng bề mặt.

### Bước 5: Căn Góc Camera & Bố Cục (Framing)
- Tiêu cự (Focal Length):
  - 85mm - 105mm: Chụp sản phẩm, chân dung (không bị méo hình).
  - 50mm: Góc nhìn tự nhiên mắt người.
  - 24mm - 35mm: Không gian kiến trúc hoặc bối cảnh rộng.
- Căn bố cục quy tắc 1/3 (Rule of thirds) hoặc chính tâm (Symmetrical Center).

### Bước 6: Render & Bàn Giao
- Chọn Render Engine:
  - `CYCLES`: Dành cho render chất lượng cao, raytracing chân thực, sample 128 - 256 kèm Denoise (`scene.cycles.use_denoising = True`).
  - `BLENDER_EEVEE_NEXT`: Dành cho render nhanh hoặc thời gian thực.
- Xuất file ảnh định dạng PNG (RGB/RGBA 8-bit hoặc 16-bit) lưu vào thư mục dự án.
- Báo cáo kết quả kèm thông số render và đường dẫn file ảnh hoàn thành.
