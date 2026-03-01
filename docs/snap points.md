Vai trò của Snap Point (Role)
Hệ thống snap point có 4 vai trò xác định cách các điểm snap được phép kết nối với nhau:

🟢 surface — Bề mặt phẳng
Là các mặt phẳng của vật thể rắn (thân robot, block hình hộp, v.v.). Ví dụ: mặt trên, mặt dưới, mặt trước, mặt sau, mặt trái, mặt phải của body hoặc box.

→ Dùng cho: Mọi mặt phẳng bên ngoài của vật thể mà các linh kiện khác có thể bám vào.

🟡 attach — Điểm bám
Là mặt "lưng" của linh kiện — mặt mà linh kiện dùng để bám vào bề mặt khác. Ví dụ: mặt sau của cảm biến màu (ColorSensor.mountBack), đáy GPS (GPSSensor.mountBottom), đáy cần tay (ArmActuator.base).

→ Dùng cho: Mặt tiếp xúc mà linh kiện dùng để gắn vào body hoặc actuator.

🔵 mount — Điểm ngàm/trụ
Là đầu ra của actuator — nơi mà các linh kiện con có thể gắn vào. Ví dụ: đầu cánh tay (ArmActuator.armTip), mặt xoay của swivel (SwivelActuator.platform), đầu trục motor (MotorActuator.shaftTip).

→ Dùng cho: Vị trí trên actuator mà linh kiện khác gắn vào (nhận attach từ sensor/chip).

🟣 axle — Trục xoay
Là trục quay cho các kết nối xoay vòng (motor shaft → wheel center). Ví dụ: đầu trục motor (shaftTip) lắp vào tâm bánh xe (wheelCenter).

→ Dùng cho: Liên kết xoay, chỉ snap với axle khác.

Ma trận tương thích
surface	attach	mount	axle
surface	✅	✅	✅	❌
attach	✅	❌	✅	❌
mount	✅	✅	❌	❌
axle	❌	❌	❌	✅
Tóm tắt logic:

surface ↔ surface: Hai block đặt cạnh nhau ✅
surface ↔ attach: Cảm biến bám vào mặt body ✅ (trường hợp phổ biến nhất)
mount ↔ attach: Cảm biến gắn vào đầu cánh tay ✅
axle ↔ axle: Bánh xe cắm vào trục motor ✅
attach ↔ attach: Hai mặt lưng chạm nhau → vô nghĩa ❌
mount ↔ mount: Hai đầu ngàm chạm nhau → vô nghĩa ❌
axle ↔ bất kỳ non-axle: Trục quay không snap với bề mặt phẳng ❌