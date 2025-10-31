from domain.services.finance.duty import calc_wa_stamp_duty

def test_calc_duty_with_custom_brackets():
    # Скобки: (lower, rate, fixed)
    #   [0,100): 10% ; [100,200): 20% с fixed=10 ; [200,∞): 30% с fixed=30
    br = [
        (0.0,   0.10,  0.0),
        (100.0, 0.20, 10.0),
        (200.0, 0.30, 30.0),
    ]
    assert abs(calc_wa_stamp_duty(50,   br) - (0 + (50-0)*0.10)) < 1e-6       # 5
    assert abs(calc_wa_stamp_duty(150,  br) - (10 + (150-100)*0.20)) < 1e-6   # 20
    assert abs(calc_wa_stamp_duty(250,  br) - (30 + (250-200)*0.30)) < 1e-6   # 45
    assert abs(calc_wa_stamp_duty(200,  br) - 30.0) < 1e-6
    assert abs(calc_wa_stamp_duty(0,    br) - 0.0) < 1e-6
    assert abs(calc_wa_stamp_duty(-10,  br) - 0.0) < 1e-6