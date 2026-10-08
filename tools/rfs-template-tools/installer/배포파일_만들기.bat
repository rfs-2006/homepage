@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~f0'; $t=[IO.File]::ReadAllText($f,[Text.Encoding]::UTF8); $s=$t.IndexOf('#MK'+'START'); $e=$t.IndexOf('#MK'+'END'); iex $t.Substring($s,$e-$s)"
echo.
pause
exit /b
#MKSTART
$ErrorActionPreference = 'Stop'
try {
    $here = Split-Path -Parent $f
    $src  = Join-Path $here 'RFS_Report.dotm'
    if (-not (Test-Path $src)) { throw 'RFS_Report.dotm 을 이 파일과 같은 폴더에 두세요.' }
    $ts = '#TPL' + 'START'; $te = '#TPL' + 'END'
    $a = $t.IndexOf($ts); $b = $t.IndexOf($te)
    $tpl = $t.Substring($a + $ts.Length, $b - $a - $ts.Length).TrimStart("`r", "`n")
    # gzip 후 base64 (글꼴이 절반 크기로 → 설치 파일이 빨리 뜸). 설치 쪽 Section이 1F 8B를 보고 풀어줌
    function Enc([string]$p) {
        $raw = [IO.File]::ReadAllBytes($p)
        $ms = New-Object IO.MemoryStream
        $gz = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionMode]::Compress)
        $gz.Write($raw, 0, $raw.Length); $gz.Close()
        return [Convert]::ToBase64String($ms.ToArray(), 'InsertLineBreaks')
    }
    # PNG → ICO (256/48/32/16, PNG 압축 아이콘). 밝은 인장은 남색 원 위에 얹음
    function Make-Ico([string]$pngPath, [string]$outIco, [bool]$onNavy) {
        Add-Type -AssemblyName System.Drawing
        $img = [Drawing.Image]::FromFile($pngPath)
        $sizes = @(256, 48, 32, 16); $blobs = @()
        foreach ($sz in $sizes) {
            $bmp = New-Object Drawing.Bitmap $sz, $sz
            $gr = [Drawing.Graphics]::FromImage($bmp)
            $gr.SmoothingMode = 'AntiAlias'; $gr.InterpolationMode = 'HighQualityBicubic'; $gr.PixelOffsetMode = 'HighQuality'
            $gr.Clear([Drawing.Color]::Transparent)
            $pad = 0
            if ($onNavy) { $br = New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 32, 56, 100)); $gr.FillEllipse($br, 0, 0, $sz - 1, $sz - 1); $pad = [Math]::Max(1, [int]($sz * 0.055)) }
            $k = [Math]::Min(($sz - 2 * $pad) / $img.Width, ($sz - 2 * $pad) / $img.Height)
            $iw = [int]($img.Width * $k); $ih = [int]($img.Height * $k)
            $gr.DrawImage($img, [int](($sz - $iw) / 2), [int](($sz - $ih) / 2), $iw, $ih); $gr.Dispose()
            $ms = New-Object IO.MemoryStream; $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
            $blobs += ,($ms.ToArray())
        }
        $img.Dispose()
        $os = New-Object IO.MemoryStream; $bw = New-Object IO.BinaryWriter($os)
        $bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]$sizes.Count)
        $off = 6 + 16 * $sizes.Count
        for ($j = 0; $j -lt $sizes.Count; $j++) {
            $dim = $sizes[$j]; if ($dim -ge 256) { $dim = 0 }
            $bw.Write([byte]$dim); $bw.Write([byte]$dim); $bw.Write([byte]0); $bw.Write([byte]0)
            $bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$blobs[$j].Length); $bw.Write([UInt32]$off)
            $off += $blobs[$j].Length
        }
        foreach ($bl in $blobs) { $bw.Write([byte[]]$bl) }
        $bw.Flush(); [IO.File]::WriteAllBytes($outIco, $os.ToArray())
    }
    function FirstFile([string[]]$names) { foreach ($x in $names) { $p = Join-Path $here $x; if (Test-Path $p) { return $p } }; return $null }
    $body = $tpl.TrimEnd() + "`r`n"
    $seal = FirstFile @('rfs-seal-light.png', 'seal.png')
    $bg   = FirstFile @('bg.jpg', 'bg.png', 'background.jpg', 'background.png')
    if ($seal) { $body += '__RFS_' + 'SEAL__' + "`r`n" + (Enc $seal) + "`r`n"; Write-Host ('인장 이미지 포함: ' + (Split-Path $seal -Leaf)) }
    else { Write-Host '인장 이미지 없음 → 설치할 때 caurfs.kr에서 받아옴' -ForegroundColor DarkGray }
    if ($bg) { $body += '__RFS_' + 'BG__' + "`r`n" + (Enc $bg) + "`r`n"; Write-Host ('배경 이미지 포함: ' + (Split-Path $bg -Leaf)) }
    else { Write-Host '배경 이미지 없음 → 설치할 때 인터넷에서 받아옴' -ForegroundColor DarkGray }
    # 설치 창 전용 글꼴 (Pretendard): ui-fonts 폴더 → 설치 파일에 포함 (팀원 PC에 설치하지 않음)
    $uiDir = Join-Path $here 'ui-fonts'
    $uf = @()
    if (Test-Path $uiDir) { $uf = @(Get-ChildItem -Path $uiDir -File | Where-Object { @('.ttf', '.otf') -contains $_.Extension.ToLower() }) }
    # ui-fonts 폴더가 없으면 이 PC에 설치된 Pretendard(Regular/Medium/SemiBold)를 가져옴
    if ($uf.Count -eq 0) {
        $seen = @{}
        foreach ($rk in @('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts', 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts')) {
            if (-not (Test-Path $rk)) { continue }
            foreach ($pr in (Get-ItemProperty -Path $rk).PSObject.Properties) {
                if ($pr.Name -notmatch '^Pretendard (Regular|Medium|SemiBold)\b') { continue }
                $fpath = [string]$pr.Value
                if (-not [IO.Path]::IsPathRooted($fpath)) { $fpath = Join-Path $env:WINDIR ('Fonts\' + $fpath) }
                if ((Test-Path $fpath) -and -not $seen.ContainsKey($fpath.ToLower())) { $seen[$fpath.ToLower()] = $true; $uf += (Get-Item $fpath) }
            }
        }
    }
    if ($uf.Count -gt 0) {
        $ul = ($uf | ForEach-Object { $_.Name }) -join '|'
        $body += '__RFS_' + 'UIFONTLIST__' + "`r`n" + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($ul)) + "`r`n"
        for ($j = 0; $j -lt $uf.Count; $j++) { $body += '__RFS_' + 'UIFONT' + $j + '__' + "`r`n" + (Enc $uf[$j].FullName) + "`r`n" }
        Write-Host ('설치 창 글꼴 포함: ' + $uf.Count + '개 (' + $ul.Replace('|', ', ') + ')')
    } else {
        Write-Host '설치 창 글꼴(Pretendard) 없음 → 설치 창은 맑은 고딕으로 표시' -ForegroundColor Yellow
    }
    # 글꼴: fonts 폴더가 있으면 그 안의 것, 없으면 이 PC에 설치된 리포트 글꼴(KoPubWorld 돋움, 윤고딕 540)을 자동으로
    $ff = @(); $fnames = @()
    $fontDir = Join-Path $here 'fonts'
    if (Test-Path $fontDir) {
        $ff = @(Get-ChildItem -Path $fontDir -File | Where-Object { @('.ttf', '.otf', '.ttc') -contains $_.Extension.ToLower() })
    } else {
        $keys = @('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts', 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts')
        $found = @{}
        foreach ($rk in $keys) {
            if (-not (Test-Path $rk)) { continue }
            foreach ($pr in (Get-ItemProperty -Path $rk).PSObject.Properties) {
                if ($pr.Name -notmatch 'KoPubWorld\s*(돋움|Dotum)|Yoon.*540|윤고딕\s*540') { continue }
                $fpath = [string]$pr.Value
                if (-not [IO.Path]::IsPathRooted($fpath)) { $fpath = Join-Path $env:WINDIR ('Fonts\' + $fpath) }
                if ((Test-Path $fpath) -and -not $found.ContainsKey([IO.Path]::GetFileName($fpath).ToLower())) { $found[[IO.Path]::GetFileName($fpath).ToLower()] = @((Get-Item $fpath), $pr.Name) }
            }
        }
        $ff = @($found.Values | ForEach-Object { $_[0] }); $fnames = @($found.Values | ForEach-Object { $_[1] })
    }
    if ($ff.Count -gt 0) {
        $pairs = @(); for ($j = 0; $j -lt $ff.Count; $j++) { $rn = ''; if ($j -lt $fnames.Count) { $rn = $fnames[$j] }; $pairs += ($ff[$j].Name + '::' + $rn) }
        $list = $pairs -join '|'
        $body += '__RFS_' + 'FONTLIST__' + "`r`n" + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($list)) + "`r`n"
        for ($j = 0; $j -lt $ff.Count; $j++) { $body += '__RFS_' + 'FONT' + $j + '__' + "`r`n" + (Enc $ff[$j].FullName) + "`r`n" }
        Write-Host ('글꼴 포함: ' + $ff.Count + '개 (' + (($ff | ForEach-Object { $_.Name }) -join ', ') + ')')
    } else {
        Write-Host '글꼴 없음 → 템플릿만 설치' -ForegroundColor DarkGray
    }
    $body += '__RFS_' + 'PAYLOAD__' + "`r`n" + (Enc $src) + "`r`n\"
    $out = Join-Path $here 'RFS_Template_Setup.bat'
    [IO.File]::WriteAllText($out, $body.Replace("`r`n", "`n").Replace("`n", "`r`n"), (New-Object Text.UTF8Encoding $false))
    Write-Host ''
    Write-Host '[OK] RFS_Template_Setup.bat 생성' -ForegroundColor Green

    # ---------- exe 만들기 (ps2exe) ----------
    try {
        $ps = $tpl.Substring($tpl.IndexOf('#PS' + 'START'), $tpl.IndexOf('#PS' + 'END') - $tpl.IndexOf('#PS' + 'START'))
        $data = $body.Substring($body.IndexOf('#PS' + 'END'))
        $data = $data.Substring($data.IndexOf("`n") + 1)
        $src2 = "`$t = @'`r`n" + $data.TrimEnd() + "`r`n'@`r`n" +
                "try {`r`n" + $ps + "`r`n} catch { Add-Type -AssemblyName PresentationFramework; [void][System.Windows.MessageBox]::Show(`$_.Exception.Message, 'R.F.S. Installer') }`r`n"
        $ps1 = Join-Path $env:TEMP 'RFS_setup_build.ps1'
        [IO.File]::WriteAllText($ps1, $src2, (New-Object Text.UTF8Encoding $true))
        if (-not (Get-Command Invoke-ps2exe -ErrorAction SilentlyContinue)) {
            Write-Host 'exe 변환 도구(ps2exe) 설치 중... (처음 한 번)' -ForegroundColor DarkGray
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Scope CurrentUser | Out-Null
            Install-Module -Name ps2exe -Scope CurrentUser -Force -AllowClobber
            Import-Module ps2exe
        }
        $exe = Join-Path $here 'RFS_Template_Setup.exe'
        $args2 = @{ inputFile = $ps1; outputFile = $exe; noConsole = $true; STA = $true
                    title = 'R.F.S. Template Setup'; product = 'R.F.S. Equity Research Template'; description = 'R.F.S. Equity Research Template Setup'; company = 'R.F.S. Chung-Ang University'
                    copyright = 'RFS 43대 회장 김민석'; version = '1.0.0.0' }
        $ico = Join-Path $here 'rfs.ico'
        if (-not (Test-Path $ico)) {
            $navy = FirstFile @('rfs-seal-navy.png')
            $pic = $navy; if (-not $pic) { $pic = $seal }
            if ($pic) { $ico = Join-Path $env:TEMP 'rfs_seal.ico'; Make-Ico $pic $ico (-not $navy); Write-Host ('아이콘 생성: ' + (Split-Path $pic -Leaf)) }
            else { $ico = $null }
        }
        if ($ico) { $args2.iconFile = $ico }
        Invoke-ps2exe @args2 | Out-Null
        Remove-Item $ps1 -ErrorAction SilentlyContinue
        if (Test-Path $exe) { Write-Host '[OK] RFS_Template_Setup.exe 생성' -ForegroundColor Green }
    } catch {
        Write-Host ('exe는 건너뜀 (' + $_.Exception.Message + ') → RFS_Template_Setup.bat을 쓰면 됩니다.') -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host '팀원에게는 RFS_Template_Setup.exe (없으면 .bat) 하나만 보내면 됩니다.'
} catch {
    Write-Host ('실패: ' + $_.Exception.Message) -ForegroundColor Red
}
#MKEND
#TPLSTART
@echo off
start "" powershell -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -Command "try { $f='%~f0'; $t=[IO.File]::ReadAllText($f,[Text.Encoding]::UTF8); $s=$t.IndexOf('#PS'+'START'); $e=$t.IndexOf('#PS'+'END'); iex $t.Substring($s,$e-$s) } catch { Add-Type -AssemblyName PresentationFramework; [void][System.Windows.MessageBox]::Show($_.Exception.Message,'R.F.S. Installer') }"
exit /b
#PSSTART
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

# ---------- embedded data ----------
function Section([string]$name) {
    $mk = '__RFS_' + $name + '__'
    # Ordinal: 문화권 비교는 30MB 문자열에서 한 번에 0.5초씩 걸림
    $i = $t.LastIndexOf($mk, [StringComparison]::Ordinal)
    if ($i -lt 0) { return $null }
    $s = $i + $mk.Length
    $e = $t.IndexOf('__RFS_', $s, [StringComparison]::Ordinal)
    if ($e -lt 0) { $e = $t.Length }
    $b = $t.Substring($s, $e - $s) -replace '[^A-Za-z0-9+/=]', ''
    if ($b.Length -eq 0) { return $null }
    $bytes = [Convert]::FromBase64String($b)
    if ($bytes.Length -gt 2 -and $bytes[0] -eq 0x1F -and $bytes[1] -eq 0x8B) {
        $gz = New-Object IO.Compression.GZipStream((New-Object IO.MemoryStream(,$bytes)), [IO.Compression.CompressionMode]::Decompress)
        $out = New-Object IO.MemoryStream; $gz.CopyTo($out); $gz.Close(); $bytes = $out.ToArray()
    }
    return ,$bytes
}
function Fetch([string]$url) {
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $rq = [Net.HttpWebRequest]::Create($url); $rq.Timeout = 2500; $rq.UserAgent = 'Mozilla/5.0'
        $rs = $rq.GetResponse(); $ms = New-Object IO.MemoryStream
        $rs.GetResponseStream().CopyTo($ms); $rs.Close()
        return ,$ms.ToArray()
    } catch { return $null }
}
function ToImage($b, [int]$decodeWidth = 0) {
    if (-not $b) { return $null }
    try {
        $bi = New-Object Windows.Media.Imaging.BitmapImage
        $bi.BeginInit(); $bi.CacheOption = 'OnLoad'; $bi.StreamSource = New-Object IO.MemoryStream(,[byte[]]$b)
        if ($decodeWidth -gt 0) { $bi.DecodePixelWidth = $decodeWidth }
        $bi.EndInit(); $bi.Freeze()
        return $bi
    } catch { return $null }
}

# ---------- fonts (per-user, no admin) ----------
function ActFonts {
    $lst = Section 'FONTLIST'
    if (-not $lst) { return }
    # C# 컴파일(~0.3초)은 창이 뜬 뒤, 실제 설치할 때만
    try {
        $sigF = '[DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern int AddFontResource(string f); [DllImport("user32.dll", SetLastError = true)] public static extern IntPtr SendMessageTimeout(IntPtr h, uint m, UIntPtr w, IntPtr l, uint f, uint t, out UIntPtr r);'
        Add-Type -MemberDefinition $sigF -Name FontApi -Namespace RFSNative
    } catch {}
    $names = [Text.Encoding]::UTF8.GetString([byte[]]$lst).Split('|')
    $fdir = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
    New-Item -ItemType Directory -Force -Path $fdir | Out-Null
    $reg = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
    if (-not (Test-Path $reg)) { New-Item -Path $reg -Force | Out-Null }
    # 이미 등록된 글꼴 이름 (PC 전체 + 이 사용자). "(TrueType)" 같은 꼬리는 떼고 비교
    $have = @{}
    foreach ($rk in @('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts', $reg)) {
        if (-not (Test-Path $rk)) { continue }
        foreach ($pr in (Get-ItemProperty -Path $rk).PSObject.Properties) {
            $have[($pr.Name -replace '\s*\([^)]*\)\s*$', '').Trim().ToLower()] = $true
            $have[('file:' + [IO.Path]::GetFileName([string]$pr.Value)).ToLower()] = $true
        }
    }
    for ($q = 0; $q -lt $names.Count; $q++) {
        $parts = $names[$q] -split '::', 2
        $nm = $parts[0]; $rn = ''; if ($parts.Count -gt 1) { $rn = $parts[1] }
        $key = ($rn -replace '\s*\([^)]*\)\s*$', '').Trim().ToLower()
        if ($rn -and $have.ContainsKey($key)) { continue }                       # 같은 글꼴 이름이 이미 있음
        if ($have.ContainsKey(('file:' + $nm).ToLower())) { continue }           # 같은 파일이 이미 등록됨
        if (Test-Path (Join-Path $env:WINDIR ('Fonts\' + $nm))) { continue }
        $fb = Section ('FONT' + $q)
        if (-not $fb) { continue }
        $fp = Join-Path $fdir $nm
        if (-not (Test-Path $fp)) { [IO.File]::WriteAllBytes($fp, [byte[]]$fb) }
        $kind = 'TrueType'; if ($nm.ToLower().EndsWith('.otf')) { $kind = 'OpenType' }
        $regName = $rn; if (-not $regName) { $regName = [IO.Path]::GetFileNameWithoutExtension($nm) + ' (' + $kind + ')' }
        New-ItemProperty -Path $reg -Name $regName -Value $fp -PropertyType String -Force | Out-Null
        try { [void][RFSNative.FontApi]::AddFontResource($fp) } catch {}
    }
    try { $res = [UIntPtr]::Zero; [void][RFSNative.FontApi]::SendMessageTimeout([IntPtr]0xffff, 0x1D, [UIntPtr]::Zero, [IntPtr]::Zero, 2, 1000, [ref]$res) } catch {}
}

# ---------- install steps ----------
$script:ver = '16.0'
function Act0 { if (Get-Process WINWORD -ErrorAction SilentlyContinue) { throw '워드를 모두 닫고 다시 시도해 주세요.' } }
function Act1 {
    $opt = "HKCU:\Software\Microsoft\Office\$($script:ver)\Word\Options"
    if (-not (Test-Path $opt)) { New-Item -Path $opt -Force | Out-Null }
    $p = (Get-ItemProperty -Path $opt -Name PersonalTemplates -ErrorAction SilentlyContinue).PersonalTemplates
    if ([string]::IsNullOrWhiteSpace($p)) {
        $p = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Custom Office Templates'
        New-ItemProperty -Path $opt -Name PersonalTemplates -Value $p -PropertyType ExpandString -Force | Out-Null
    }
    $script:tpl = [Environment]::ExpandEnvironmentVariables($p)
    New-Item -ItemType Directory -Force -Path $script:tpl | Out-Null
}
function Act2 {
    $tl = "HKCU:\Software\Microsoft\Office\$($script:ver)\Word\Security\Trusted Locations\RFS"
    New-Item -Path $tl -Force | Out-Null
    New-ItemProperty -Path $tl -Name Path -Value ($script:tpl.TrimEnd('\') + '\') -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $tl -Name AllowSubfolders -Value 1 -PropertyType DWord -Force | Out-Null
    New-ItemProperty -Path $tl -Name Description -Value 'RFS Report Template' -PropertyType String -Force | Out-Null
}
function Act3 {
    ActFonts
    $b = Section 'PAYLOAD'
    if (-not $b) { throw '설치 파일이 손상되었습니다. 새 파일을 받아 주세요.' }
    $script:dst = Join-Path $script:tpl 'RFS_Report.dotm'
    [IO.File]::WriteAllBytes($script:dst, [byte[]]$b)
    Unblock-File -Path $script:dst -ErrorAction SilentlyContinue
}

# ---------- window-only fonts (loaded privately, never installed) ----------
function LoadUiFonts {
    $res = @{ sans = $null; serif = $null }
    $lst = Section 'UIFONTLIST'
    if (-not $lst) { return $res }
    $dir = Join-Path $env:TEMP 'RFS-Setup-UI'
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $un = [Text.Encoding]::UTF8.GetString([byte[]]$lst).Split('|')
    for ($q = 0; $q -lt $un.Count; $q++) {
        $fp = Join-Path $dir $un[$q]
        if (-not (Test-Path $fp)) { $fb = Section ('UIFONT' + $q); if ($fb) { [IO.File]::WriteAllBytes($fp, [byte[]]$fb) } }
    }
    try {
        foreach ($fam in [Windows.Media.Fonts]::GetFontFamilies([Uri]::new($dir.TrimEnd('\') + '\'))) {
            $fn = [string]($fam.FamilyNames.Values | Select-Object -First 1)
            if ($fn -eq 'Pretendard') { $res.sans = $fam }
            elseif ($fn -eq 'Source Serif 4') { $res.serif = $fam }
            elseif ($fn -like 'Source Serif 4*' -and -not $res.serif) { $res.serif = $fam }
        }
    } catch {}
    return $res
}
$ui = LoadUiFonts

# ---------- window ----------
$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="R.F.S. Installer" Width="600" Height="400" WindowStyle="None" AllowsTransparency="True"
        Background="Transparent" ResizeMode="NoResize" WindowStartupLocation="CenterScreen"
        FontFamily="Pretendard, Malgun Gothic" Foreground="#F7F6F3" UseLayoutRounding="True" SnapsToDevicePixels="True" TextOptions.TextFormattingMode="Ideal">
  <Window.Resources>
    <Style x:Key="Chrome" TargetType="Button">
      <Setter Property="Foreground" Value="#99F7F6F3"/><Setter Property="Background" Value="Transparent"/>
      <Setter Property="Focusable" Value="False"/>
      <Setter Property="Template"><Setter.Value>
        <ControlTemplate TargetType="Button">
          <Border x:Name="b" Background="{TemplateBinding Background}"><ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/></Border>
          <ControlTemplate.Triggers>
            <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="b" Property="Background" Value="#1FF7F6F3"/></Trigger>
            <Trigger Property="IsEnabled" Value="False"><Setter Property="Opacity" Value="0.4"/></Trigger>
          </ControlTemplate.Triggers>
        </ControlTemplate>
      </Setter.Value></Setter>
    </Style>
    <Style x:Key="CloseChrome" TargetType="Button" BasedOn="{StaticResource Chrome}">
      <Setter Property="Template"><Setter.Value>
        <ControlTemplate TargetType="Button">
          <Border x:Name="b" Background="{TemplateBinding Background}"><ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/></Border>
          <ControlTemplate.Triggers>
            <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="b" Property="Background" Value="#C42B1C"/><Setter Property="Foreground" Value="#FFFFFF"/></Trigger>
            <Trigger Property="IsPressed" Value="True"><Setter TargetName="b" Property="Background" Value="#A4261A"/></Trigger>
            <Trigger Property="IsEnabled" Value="False"><Setter Property="Opacity" Value="0.4"/></Trigger>
          </ControlTemplate.Triggers>
        </ControlTemplate>
      </Setter.Value></Setter>
    </Style>
    <Style x:Key="Primary" TargetType="Button">
      <Setter Property="Foreground" Value="#111C2E"/><Setter Property="Background" Value="#F7F6F3"/>
      <Setter Property="FontSize" Value="13"/><Setter Property="FontWeight" Value="SemiBold"/><Setter Property="Height" Value="34"/><Setter Property="MinWidth" Value="104"/>
      <Setter Property="Focusable" Value="False"/><Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template"><Setter.Value>
        <ControlTemplate TargetType="Button">
          <Border x:Name="b" Background="{TemplateBinding Background}" CornerRadius="4" Padding="22,0">
            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
          </Border>
          <ControlTemplate.Triggers>
            <Trigger Property="IsMouseOver" Value="True"><Setter TargetName="b" Property="Background" Value="#FFFFFF"/></Trigger>
            <Trigger Property="IsPressed" Value="True"><Setter TargetName="b" Property="Background" Value="#E2E0DA"/></Trigger>
            <Trigger Property="IsEnabled" Value="False"><Setter TargetName="b" Property="Background" Value="#26F7F6F3"/><Setter Property="Foreground" Value="#99F7F6F3"/><Setter Property="Cursor" Value="Arrow"/></Trigger>
          </ControlTemplate.Triggers>
        </ControlTemplate>
      </Setter.Value></Setter>
    </Style>
  </Window.Resources>
  <Grid>
  <Grid x:Name="Shadow" Opacity="0" Margin="20" IsHitTestVisible="False"><Border Margin="-1,3,-1,-5" CornerRadius="1" Background="#06000000"/><Border Margin="-2,2,-2,-6" CornerRadius="2" Background="#06000000"/><Border Margin="-3,1,-3,-7" CornerRadius="3" Background="#06000000"/><Border Margin="-4,0,-4,-8" CornerRadius="4" Background="#06000000"/><Border Margin="-5,-1,-5,-9" CornerRadius="5" Background="#06000000"/><Border Margin="-6,-2,-6,-10" CornerRadius="6" Background="#06000000"/><Border Margin="-7,-3,-7,-11" CornerRadius="7" Background="#06000000"/><Border Margin="-8,-4,-8,-12" CornerRadius="8" Background="#06000000"/><Border Margin="-9,-5,-9,-13" CornerRadius="9" Background="#06000000"/><Border Margin="-10,-6,-10,-14" CornerRadius="10" Background="#06000000"/><Border Margin="-11,-7,-11,-15" CornerRadius="11" Background="#06000000"/><Border Margin="-12,-8,-12,-16" CornerRadius="12" Background="#06000000"/><Border Margin="-13,-9,-13,-17" CornerRadius="13" Background="#06000000"/><Border Margin="-14,-10,-14,-18" CornerRadius="14" Background="#06000000"/></Grid>
  <Grid x:Name="Root" Opacity="0" Margin="20" Width="560" Height="360">
    <Grid.Clip><RectangleGeometry Rect="0,0,560,360"/></Grid.Clip>
    <UniformGrid x:Name="Strips" Columns="10" Rows="1"><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle><Rectangle Margin="0.5,0" RenderTransformOrigin="0.5,0.5"><Rectangle.Fill><LinearGradientBrush StartPoint="0,0" EndPoint="0,1"><GradientStop Color="#203864" Offset="0"/><GradientStop Color="#111C2E" Offset="1"/></LinearGradientBrush></Rectangle.Fill><Rectangle.RenderTransform><ScaleTransform ScaleY="0"/></Rectangle.RenderTransform></Rectangle></UniformGrid>
    <Grid x:Name="Base" Opacity="0">
    <Rectangle Fill="#111C2E"/>
    <Image x:Name="Bg" Stretch="UniformToFill" Margin="-18" RenderOptions.BitmapScalingMode="HighQuality"/>
    <Rectangle>
      <Rectangle.Fill>
        <LinearGradientBrush StartPoint="0,0" EndPoint="0,1">
          <GradientStop Color="#800F1B2E" Offset="0"/><GradientStop Color="#B8111C2E" Offset="0.55"/><GradientStop Color="#E6111C2E" Offset="1"/>
        </LinearGradientBrush>
      </Rectangle.Fill>
    </Rectangle>
    <Rectangle>
      <Rectangle.Fill>
        <RadialGradientBrush Center="0.5,0.45" GradientOrigin="0.5,0.45" RadiusX="0.6" RadiusY="0.7">
          <GradientStop Color="#5C111C2E" Offset="0"/><GradientStop Color="#00111C2E" Offset="1"/>
        </RadialGradientBrush>
      </Rectangle.Fill>
    </Rectangle>
    </Grid>
    <Grid>
      <Grid.RowDefinitions><RowDefinition Height="32"/><RowDefinition Height="*"/><RowDefinition Height="56"/></Grid.RowDefinitions>
      <Rectangle x:Name="LineTop" Grid.Row="0" Height="1" VerticalAlignment="Bottom" Fill="#24F7F6F3" RenderTransformOrigin="0,0.5" IsHitTestVisible="False"><Rectangle.RenderTransform><ScaleTransform ScaleX="0"/></Rectangle.RenderTransform></Rectangle>
      <Rectangle x:Name="LineBot" Grid.Row="2" Height="1" VerticalAlignment="Top" Fill="#24F7F6F3" RenderTransformOrigin="1,0.5" IsHitTestVisible="False"><Rectangle.RenderTransform><ScaleTransform ScaleX="0"/></Rectangle.RenderTransform></Rectangle>
      <Border x:Name="TitleBar" Grid.Row="0" Background="#01000000">
        <Grid>
          <StackPanel x:Name="Sign" Opacity="0" Orientation="Horizontal" VerticalAlignment="Center" Margin="16,0,0,0"><TextBlock x:Name="SignWord" Text="R.F.S." FontSize="12.5" FontWeight="SemiBold" Foreground="#EBF7F6F3" VerticalAlignment="Center"/><Border Width="1" Height="9" Background="#47F7F6F3" Margin="11,1,11,0" VerticalAlignment="Center"/><TextBlock Text="43대 회장 김민석" FontSize="12" Foreground="#94F7F6F3" VerticalAlignment="Center"/></StackPanel>
          <StackPanel x:Name="Chrome" Opacity="0" Orientation="Horizontal" HorizontalAlignment="Right">
            <Button x:Name="MinBtn" Style="{StaticResource Chrome}" Width="44" Content="&#xE921;" FontFamily="Segoe Fluent Icons, Segoe MDL2 Assets" FontSize="10"/>
            <Button x:Name="CloseBtn" Style="{StaticResource CloseChrome}" Width="44" Content="&#xE8BB;" FontFamily="Segoe Fluent Icons, Segoe MDL2 Assets" FontSize="10" IsCancel="True"/>
          </StackPanel>
        </Grid>
      </Border>
      <Grid Grid.Row="1" Margin="40,0">
        <Grid.ColumnDefinitions><ColumnDefinition Width="*"/><ColumnDefinition Width="Auto"/></Grid.ColumnDefinitions>
        <StackPanel Grid.Column="0" VerticalAlignment="Center">
          <Grid x:Name="SealBox" HorizontalAlignment="Left" Opacity="0">
            <Image x:Name="Seal" Width="60" Opacity="0.92"/>
            <TextBlock x:Name="SealText" Text="R.F.S." FontSize="22" FontWeight="SemiBold" Visibility="Collapsed"/>
          </Grid>
          <TextBlock x:Name="Heading" Opacity="0" Text="Equity Research Template" FontWeight="SemiBold" FontSize="26" LineHeight="32" TextWrapping="Wrap" MaxWidth="290" HorizontalAlignment="Left" Margin="0,22,0,0"/>
          <TextBlock x:Name="Sub" Text="좋은 리포트 기대하겠습니다." FontSize="14" Foreground="#B3F7F6F3" Margin="0,10,0,0" Visibility="Collapsed"/>
        </StackPanel>
        <StackPanel x:Name="Steps" Grid.Column="1" VerticalAlignment="Center" Margin="32,0,0,0" Opacity="0">
          <Grid Margin="0,6"><Grid.ColumnDefinitions><ColumnDefinition Width="18"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <Border x:Name="Box0" Width="18" Height="18" CornerRadius="9" BorderThickness="1" BorderBrush="#40F7F6F3" Background="Transparent"><Grid>
              <TextBlock x:Name="Num0" Text="1" FontSize="10" FontWeight="SemiBold" Foreground="#80F7F6F3" HorizontalAlignment="Center" VerticalAlignment="Center"/>
              <Ellipse x:Name="Dot0" Width="6" Height="6" Fill="#F7F6F3" Opacity="0" Visibility="Collapsed"/>
              <Path x:Name="Chk0" Data="M4.3,8.2 L6.9,10.8 L11.7,5.8" Stroke="#F7F6F3" StrokeThickness="1.5" StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round" Opacity="0" Visibility="Collapsed"/>
            </Grid></Border>
            <TextBlock x:Name="Lbl0" Grid.Column="1" Text="워드 종료 확인" FontSize="13" Margin="12,0,0,0" Foreground="#73F7F6F3" VerticalAlignment="Center"/>
          </Grid>
          <Grid Margin="0,6"><Grid.ColumnDefinitions><ColumnDefinition Width="18"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <Border x:Name="Box1" Width="18" Height="18" CornerRadius="9" BorderThickness="1" BorderBrush="#40F7F6F3" Background="Transparent"><Grid>
              <TextBlock x:Name="Num1" Text="2" FontSize="10" FontWeight="SemiBold" Foreground="#80F7F6F3" HorizontalAlignment="Center" VerticalAlignment="Center"/>
              <Ellipse x:Name="Dot1" Width="6" Height="6" Fill="#F7F6F3" Opacity="0" Visibility="Collapsed"/>
              <Path x:Name="Chk1" Data="M4.3,8.2 L6.9,10.8 L11.7,5.8" Stroke="#F7F6F3" StrokeThickness="1.5" StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round" Opacity="0" Visibility="Collapsed"/>
            </Grid></Border>
            <TextBlock x:Name="Lbl1" Grid.Column="1" Text="폴더 확인" FontSize="13" Margin="12,0,0,0" Foreground="#73F7F6F3" VerticalAlignment="Center"/>
          </Grid>
          <Grid Margin="0,6"><Grid.ColumnDefinitions><ColumnDefinition Width="18"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <Border x:Name="Box2" Width="18" Height="18" CornerRadius="9" BorderThickness="1" BorderBrush="#40F7F6F3" Background="Transparent"><Grid>
              <TextBlock x:Name="Num2" Text="3" FontSize="10" FontWeight="SemiBold" Foreground="#80F7F6F3" HorizontalAlignment="Center" VerticalAlignment="Center"/>
              <Ellipse x:Name="Dot2" Width="6" Height="6" Fill="#F7F6F3" Opacity="0" Visibility="Collapsed"/>
              <Path x:Name="Chk2" Data="M4.3,8.2 L6.9,10.8 L11.7,5.8" Stroke="#F7F6F3" StrokeThickness="1.5" StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round" Opacity="0" Visibility="Collapsed"/>
            </Grid></Border>
            <TextBlock x:Name="Lbl2" Grid.Column="1" Text="신뢰 위치 등록" FontSize="13" Margin="12,0,0,0" Foreground="#73F7F6F3" VerticalAlignment="Center"/>
          </Grid>
          <Grid Margin="0,6"><Grid.ColumnDefinitions><ColumnDefinition Width="18"/><ColumnDefinition Width="*"/></Grid.ColumnDefinitions>
            <Border x:Name="Box3" Width="18" Height="18" CornerRadius="9" BorderThickness="1" BorderBrush="#40F7F6F3" Background="Transparent"><Grid>
              <TextBlock x:Name="Num3" Text="4" FontSize="10" FontWeight="SemiBold" Foreground="#80F7F6F3" HorizontalAlignment="Center" VerticalAlignment="Center"/>
              <Ellipse x:Name="Dot3" Width="6" Height="6" Fill="#F7F6F3" Opacity="0" Visibility="Collapsed"/>
              <Path x:Name="Chk3" Data="M4.3,8.2 L6.9,10.8 L11.7,5.8" Stroke="#F7F6F3" StrokeThickness="1.5" StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round" Opacity="0" Visibility="Collapsed"/>
            </Grid></Border>
            <TextBlock x:Name="Lbl3" Grid.Column="1" Text="템플릿 설치" FontSize="13" Margin="12,0,0,0" Foreground="#73F7F6F3" VerticalAlignment="Center"/>
          </Grid>
        </StackPanel>
      </Grid>
      <Grid x:Name="Track" Grid.Row="2" Height="2" VerticalAlignment="Top" RenderTransformOrigin="0,0.5" IsHitTestVisible="False"><Grid.RenderTransform><ScaleTransform ScaleX="0"/></Grid.RenderTransform>
        <Border x:Name="Fill" Background="#8FAADC" HorizontalAlignment="Left" Width="0"/>
      </Grid>
      <Grid Grid.Row="2" Margin="40,0,20,0">
        <StackPanel x:Name="Progress" Orientation="Horizontal" VerticalAlignment="Center" Opacity="0">
          <TextBlock x:Name="Pct" Text="0%" FontSize="13" FontWeight="SemiBold" Typography.NumeralAlignment="Tabular" MinWidth="42" Visibility="Collapsed"/>
          <TextBlock x:Name="Status" Text="대기 중" FontSize="13" Foreground="#99F7F6F3"/>
        </StackPanel>
        <Button x:Name="Main" Opacity="0" IsDefault="True" Style="{StaticResource Primary}" Content="설치하기" HorizontalAlignment="Right" VerticalAlignment="Center"/>
      </Grid>
    </Grid>
    <Grid x:Name="Splash" IsHitTestVisible="False">
      <Grid x:Name="SplashMark" Opacity="0" RenderTransformOrigin="0.5,0.5" HorizontalAlignment="Center" VerticalAlignment="Center">
        <Image x:Name="SplashSeal" Width="112"/>
        <TextBlock x:Name="SplashSealText" Text="R.F.S." FontSize="40" FontWeight="SemiBold" Visibility="Collapsed"/>
      </Grid>
    </Grid>
  </Grid>
  </Grid>
</Window>
'@
try { $win = [Windows.Markup.XamlReader]::Parse($xaml) } catch { $win = $null }
if (-not $win) {
    try { Act0; Act1; Act2; Act3
          [void][Windows.MessageBox]::Show("설치가 완료되었습니다.`n`n좋은 리포트 기대하겠습니다.`n`nRFS 43대 회장 김민석", 'R.F.S. Installer') }
    catch { [void][Windows.MessageBox]::Show($_.Exception.Message, 'R.F.S. Installer') }
    return
}
$n = @{}
foreach ($k in 'SignWord','Shadow','Splash','SplashMark','SplashSeal','SplashSealText','Strips','Base','LineTop','LineBot','Chrome','Root','Sign','SealBox','Progress','TitleBar','MinBtn','CloseBtn','Bg','Seal','SealText','Heading','Steps','Sub','Status','Pct','Track','Fill','Main') { $n[$k] = $win.FindName($k) }
foreach ($i in 0..3) { foreach ($k in 'Box','Num','Dot','Chk','Lbl') { $n["$k$i"] = $win.FindName("$k$i") } }
$bc = New-Object Windows.Media.BrushConverter
$famSans = [Windows.Media.FontFamily]::new('Pretendard, Malgun Gothic'); if ($ui.sans) { $famSans = $ui.sans }
$win.FontFamily = $famSans
try { $win.TaskbarItemInfo = [Windows.Shell.TaskbarItemInfo]::new() } catch {}
function Brush([string]$hex) { return $bc.ConvertFromString($hex) }

$seal = ToImage (Section 'SEAL') 240; if (-not $seal) { $seal = ToImage (Fetch 'https://caurfs.kr/assets/rfs-seal-light.png') 240 }
if ($seal) { $n.Seal.Source = $seal; $n.SplashSeal.Source = $seal } else { $n.Seal.Visibility = 'Collapsed'; $n.SealText.Visibility = 'Visible'; $n.SplashSeal.Visibility = 'Collapsed'; $n.SplashSealText.Visibility = 'Visible' }
$bg = ToImage (Section 'BG') 1400; if (-not $bg) { $bg = ToImage (Fetch 'https://images.unsplash.com/photo-1690741818722-3f96fc94f678?auto=format&fit=crop&w=1400&h=900&q=80') 1400 }
if ($bg) { $n.Bg.Source = $bg }

# ---------- motion ----------
# 이징은 한 번 만들어 재사용 (PowerShell에서 객체 생성이 느려서)
$EaseCache = @{}
function Ease([string]$mode = 'EaseOut') {
    if (-not $EaseCache.ContainsKey($mode)) { $c = [Windows.Media.Animation.CubicEase]::new(); $c.EasingMode = $mode; $c.Freeze(); $EaseCache[$mode] = $c }
    return $EaseCache[$mode]
}
# 인트로 동안은 애니메이션을 모아뒀다가 한 번에 시작 (준비 시간이 타임라인을 잡아먹지 않게)
$script:batch = $null
function Go($target, $prop, $anim) {
    if ($null -ne $script:batch) { [void]$script:batch.Add(@($target, $prop, $anim)) } else { $target.BeginAnimation($prop, $anim) }
}
function MkAnim([double]$from, [double]$to, [int]$ms, [int]$delay, [string]$mode) {
    $x = [Windows.Media.Animation.DoubleAnimation]::new($from, $to, [Windows.Duration]::new([TimeSpan]::FromMilliseconds($ms)))
    $x.BeginTime = [TimeSpan]::FromMilliseconds($delay); $x.EasingFunction = (Ease $mode)
    [Windows.Media.Animation.Timeline]::SetDesiredFrameRate($x, 50)
    return $x
}
# 키프레임: 한 속성에 애니메이션 하나만 (나타남 → 유지 → 사라짐을 한 줄로)
function KF($target, $prop, [object[]]$frames) {
    $x = [Windows.Media.Animation.DoubleAnimationUsingKeyFrames]::new()
    foreach ($f in $frames) {
        $k = [Windows.Media.Animation.EasingDoubleKeyFrame]::new([double]$f[1], [Windows.Media.Animation.KeyTime]::FromTimeSpan([TimeSpan]::FromMilliseconds([double]$f[0])))
        $k.EasingFunction = (Ease ([string]$f[2])); [void]$x.KeyFrames.Add($k)
    }
    [Windows.Media.Animation.Timeline]::SetDesiredFrameRate($x, 50)
    Go $target $prop $x
}
function AnimProp($target, $prop, [double]$from, [double]$to, [int]$ms, [int]$delay = 0, [string]$mode = 'EaseOut') {
    Go $target $prop (MkAnim $from $to $ms $delay $mode)
}
function Anim($el, [double]$to, [int]$ms, [int]$delay = 0, [double]$rise = 0, [double]$from = -1) {
    if ($from -lt 0) { $from = $el.Opacity }
    Go $el ([Windows.UIElement]::OpacityProperty) (MkAnim $from $to $ms $delay 'EaseOut')
    if ($rise -ne 0) {
        $tt = [Windows.Media.TranslateTransform]::new(0, $rise); $el.RenderTransform = $tt
        Go $tt ([Windows.Media.TranslateTransform]::YProperty) (MkAnim $rise 0 ($ms + 120) $delay 'EaseOut')
    }
}

function SetStatus([string]$txt, [string]$color = '#D9F7F6F3') {
    $n.Status.Text = $txt; $n.Status.Foreground = Brush $color
    Anim $n.Status 1 380 0 3 0
}
function Intro {
    $script:batch = New-Object System.Collections.ArrayList
    $O = [Windows.UIElement]::OpacityProperty
    $SX = [Windows.Media.ScaleTransform]::ScaleXProperty; $SY = [Windows.Media.ScaleTransform]::ScaleYProperty
    $TX = [Windows.Media.TranslateTransform]::XProperty;  $TY = [Windows.Media.TranslateTransform]::YProperty
    $n.Root.Opacity = 1

    # 인장이 최종적으로 앉을 자리 계산 (실제 화면 배치 기준)
    $fin = $n.Seal; if ($n.Seal.Visibility -ne 'Visible') { $fin = $n.SealText }
    $src = $n.SplashSeal; if ($n.SplashSeal.Visibility -ne 'Visible') { $src = $n.SplashSealText }
    $pf = $fin.TranslatePoint([Windows.Point]::new($fin.ActualWidth / 2, $fin.ActualHeight / 2), $n.Root)
    $ps = $src.TranslatePoint([Windows.Point]::new($src.ActualWidth / 2, $src.ActualHeight / 2), $n.Root)
    $k = 0.77; if ($src.ActualWidth -gt 0 -and $fin.ActualWidth -gt 0) { $k = $fin.ActualWidth / $src.ActualWidth }
    $dx = $pf.X - $ps.X; $dy = $pf.Y - $ps.Y

    # 1) 인장만 떠오름 (창은 아직 없음)
    $grp = [Windows.Media.TransformGroup]::new()
    $sc = [Windows.Media.ScaleTransform]::new(0.86, 0.86); $mv = [Windows.Media.TranslateTransform]::new(0, 0)
    $grp.Children.Add($sc); $grp.Children.Add($mv); $n.SplashMark.RenderTransform = $grp
    KF $n.SplashMark $O @(@(0,0,'EaseOut'), @(100,0,'EaseOut'), @(800,1,'EaseOut'), @(1550,1,'EaseOut'), @(1850,0,'EaseOut'))
    $scale = @(@(0,0.88,'EaseOut'), @(100,0.88,'EaseOut'), @(900,1,'EaseOut'), @(1000,1,'EaseOut'), @(1650,$k,'EaseInOut'))
    KF $sc $SX $scale; KF $sc $SY $scale
    # 2) 인장이 자기 자리(왼쪽 위)로 이동
    KF $mv $TX @(@(0,0,'EaseOut'), @(1000,0,'EaseOut'), @(1650,$dx,'EaseInOut'))
    KF $mv $TY @(@(0,0,'EaseOut'), @(1000,0,'EaseOut'), @(1650,$dy,'EaseInOut'))
    # 3) 남색 판이 가운데부터 바깥으로 좍좍 펼쳐짐
    $order = @(4, 5, 3, 6, 2, 7, 1, 8, 0, 9)
    for ($q = 0; $q -lt 10; $q++) {
        $r = $n.Strips.Children[$order[$q]]
        AnimProp $r.RenderTransform $SY 0 1 420 (1050 + 40 * $q) 'EaseOut'
    }
    # 4) 사진·스크림이 판 위로 깔림, 판은 뒤로 사라짐
    AnimProp $n.Base $O 0 1 800 1600
    AnimProp $n.Shadow $O 0 1 700 1600
    AnimProp $n.Strips $O 1 0 350 2250
    # 인장: 떠 있던 것 → 화면 속 인장으로 이어받기
    AnimProp $n.SealBox $O 0 1 300 1500
    # 5) 선이 그어지고
    AnimProp $n.LineTop.RenderTransform $SX 0 1 600 1750 'EaseInOut'
    AnimProp $n.LineBot.RenderTransform $SX 0 1 600 1820 'EaseInOut'
    Anim $n.Chrome 1 400 1950 0 0
    Anim $n.Sign   1 500 2000 0 0
    # 6) 글자·단계·버튼이 차례로 붙음
    Anim $n.Heading  1 650 2000 8 0
    Anim $n.Steps    1 650 2120 6 0
    Anim $n.Progress 1 600 2250 4 0
    AnimProp $n.Track.RenderTransform $SX 0 1 600 2280 'EaseInOut'
    Anim $n.Main     1 600 2380 4 0

    $items = $script:batch; $script:batch = $null
    foreach ($it in $items) { $it[0].BeginAnimation($it[1], $it[2]) }
    $script:splashOff = [DateTime]::Now.AddMilliseconds(2800)
}
function SetStep([int]$i, [string]$st) {
    $box = $n["Box$i"]; $lbl = $n["Lbl$i"]; $num = $n["Num$i"]; $dot = $n["Dot$i"]; $chk = $n["Chk$i"]
    foreach ($e in $dot, $chk) { $e.BeginAnimation([Windows.UIElement]::OpacityProperty, $null); $e.Opacity = 0; $e.Visibility = 'Collapsed' }
    $num.Visibility = 'Visible'
    # 대기: 번호 / 진행: 번호 → 점 / 완료: 남색 원 + 체크 / 실패: 붉은 번호
    switch ($st) {
        'pending' { $box.BorderBrush = Brush '#40F7F6F3'; $box.Background = Brush 'Transparent'; $num.Foreground = Brush '#80F7F6F3'; $lbl.Foreground = Brush '#73F7F6F3' }
        'active'  { $box.BorderBrush = Brush '#F7F6F3';   $box.Background = Brush 'Transparent'; $num.Visibility = 'Collapsed'; $dot.Visibility = 'Visible'; Anim $dot 1 260 0 0 0; $lbl.Foreground = Brush '#F7F6F3'; Anim $lbl 1 300 0 0 0.55 }
        'fail'    { $box.BorderBrush = Brush '#F4B6B6';   $box.Background = Brush 'Transparent'; $num.Foreground = Brush '#F4B6B6'; $lbl.Foreground = Brush '#F4B6B6' }
        'done'    { $box.BorderBrush = Brush '#8FAADC';   $box.Background = Brush '#203864';     $num.Visibility = 'Collapsed'; $chk.Visibility = 'Visible'; Anim $chk 1 320 0 0 0; $lbl.Foreground = Brush '#CCF7F6F3' }
    }
}
$script:lastW = -1; $script:lastP = -1
function UpdateBar {
    $w = [Math]::Round([Math]::Max(0, $n.Track.ActualWidth * $script:pct / 100))
    if ($w -ne $script:lastW) { $n.Fill.Width = $w; $script:lastW = $w }
    $p = [int][Math]::Floor($script:pct)
    if ($p -ne $script:lastP) { $n.Pct.Text = $p.ToString() + '%'; $script:lastP = $p; if ($win.TaskbarItemInfo -and $script:phase -eq 'run') { $win.TaskbarItemInfo.ProgressState = 'Normal'; $win.TaskbarItemInfo.ProgressValue = $script:pct / 100 } }
}
$labels = @('워드 종료 확인 중…', '서식 폴더 확인 중…', '신뢰할 수 있는 위치 등록 중…', '템플릿 설치 중…')
$acts = @({ Act0 }, { Act1 }, { Act2 }, { Act3 })
$rand = New-Object Random
$script:hasFonts = [bool](Section 'FONTLIST')
if ($script:hasFonts) { $n.Lbl3.Text = '템플릿·글꼴 설치'; $labels[3] = '템플릿과 글꼴 설치 중…' }
$script:phase = 'idle'; $script:pct = 0.0; $script:goal = 0.0; $script:i = 0; $script:sub = ''; $script:wait = [DateTime]::Now

function Start-Run {
    foreach ($k in 0..3) { SetStep $k 'pending' }
    $n.Heading.Text = 'Equity Research Template'; $n.Sub.Visibility = 'Collapsed'; $n.Pct.Visibility = 'Visible'
    Anim $n.Heading 1 250 0 0
    $n.Main.Content = '설치 중…'; $n.Main.IsEnabled = $false; $n.CloseBtn.IsEnabled = $false
    $script:pct = 0.0; $script:goal = 0.0; $script:i = 0; $script:sub = 'start'; $script:phase = 'run'
    $script:lastW = -1; $script:lastP = -1
    UpdateBar
}
function FinishOut {
    Anim $n.Heading 0 320 0; Anim $n.Main 0 280 0
}
function Finish {
    $script:phase = 'done'
    if ($win.TaskbarItemInfo) { $win.TaskbarItemInfo.ProgressState = 'None' }
    $n.Heading.Text = '설치가 완료되었습니다.'; $n.Sub.Opacity = 0; $n.Sub.Visibility = 'Visible'; $n.Pct.Visibility = 'Collapsed'
    Anim $n.Heading 1 900 0 8 0
    Anim $n.Sub 1 1000 260 6 0
    SetStatus ('워드 ' + [char]0x2192 + ' 파일 ' + [char]0x203A + ' 새로 만들기 ' + [char]0x203A + ' 개인 ' + [char]0x203A + ' RFS_Report')
    $n.Main.Content = '완료'; $n.Main.IsEnabled = $true; $n.CloseBtn.IsEnabled = $true
    Anim $n.Main 1 700 500 3 0
}
function Fail([string]$msg) {
    $script:phase = 'fail'
    if ($win.TaskbarItemInfo) { $win.TaskbarItemInfo.ProgressState = 'Error' }
    SetStep $script:i 'fail'
    SetStatus $msg '#F4B6B6'
    $n.Main.Content = '다시 시도'; $n.Main.IsEnabled = $true; $n.CloseBtn.IsEnabled = $true
}

$timer = New-Object Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(33)
$script:closeAt = $null
$script:splashOff = $null
function CloseSoft { if (-not $script:closeAt) { Anim $n.Root 0 260 0; Anim $n.Shadow 0 200 0; $script:closeAt = [DateTime]::Now.AddMilliseconds(280) } }
$timer.Add_Tick({
    if ($script:closeAt -and [DateTime]::Now -ge $script:closeAt) { $timer.Stop(); $win.Close(); return }
    if ($script:splashOff -and [DateTime]::Now -ge $script:splashOff) { $n.Splash.Visibility = 'Collapsed'; $n.Strips.Visibility = 'Collapsed'; $script:splashOff = $null
        if ($script:phase -eq 'idle' -and (Get-Process WINWORD -ErrorAction SilentlyContinue)) { SetStatus '설치 전에 워드를 닫아 주세요.' '#F2D38B' } }
    if ($script:pct -lt $script:goal) {
        $script:pct = [Math]::Min($script:goal, $script:pct + ($script:goal - $script:pct) * 0.11 + $rand.NextDouble() * 0.9)
        UpdateBar
    }
    if ($script:phase -ne 'run') { return }
    $now = [DateTime]::Now
    switch ($script:sub) {
        'start' {
            SetStep $script:i 'active'; SetStatus $labels[$script:i]
            $script:goal = 25 * $script:i + 6 + $rand.Next(0, 12)
            $script:wait = $now.AddMilliseconds($rand.Next(350, 950)); $script:sub = 'act'
        }
        'act' {
            if ($now -ge $script:wait) {
                try { & $acts[$script:i] } catch { Fail $_.Exception.Message; return }
                $script:goal = 25 * ($script:i + 1); $script:sub = 'fill'
            }
        }
        'fill' {
            if ($script:pct -ge ($script:goal - 0.3)) {
                $script:pct = $script:goal; UpdateBar; SetStep $script:i 'done'; $script:i++
                if ($script:i -ge 4) { $script:wait = $now.AddMilliseconds($rand.Next(400, 900)); $script:sub = 'finish' }
                else { $script:wait = $now.AddMilliseconds($rand.Next(120, 520)); $script:sub = 'gap' }
            }
        }
        'gap'    { if ($now -ge $script:wait) { $script:sub = 'start' } }
        'finish' { if ($now -ge $script:wait) { FinishOut; $script:wait = $now.AddMilliseconds(360); $script:sub = 'swap' } }
        'swap'   { if ($now -ge $script:wait) { Finish } }
    }
})

$n.TitleBar.Add_MouseLeftButtonDown({ try { $win.DragMove() } catch {} })
$n.MinBtn.Add_Click({ $win.WindowState = 'Minimized' })
$n.CloseBtn.Add_Click({ CloseSoft })
$n.Main.Add_Click({ if ($script:splashOff -or -not $script:introDone) { return }; if ($script:phase -eq 'done') { CloseSoft } elseif ($script:phase -ne 'run') { Start-Run } })
$script:introDone = $false
$win.Add_Loaded({ UpdateBar })
# 첫 화면이 실제로 그려진 뒤에 시작
$win.Add_ContentRendered({ if (-not $script:introDone) { $script:introDone = $true; Intro } })
$timer.Start()
[void]$win.ShowDialog()
$timer.Stop()
#PSEND
#TPLEND
