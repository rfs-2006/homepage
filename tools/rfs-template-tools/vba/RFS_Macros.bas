Attribute VB_Name = "RFS_Macros"
Option Explicit
' =====================================================================
'  RFS Equity Research Template - ribbon macros (v2)
'  Import into RFS_Report.dotx (Alt+F11 > File > Import File) and save as .dotm
'  표 틀·요약박스·데이터표·사이드노트는 템플릿 끝 '블록 저장소' 페이지에서 서식째 복사해 옵니다.
' =====================================================================

Private Const RFS_NS As String = "urn:rfs:report"
Private Const VAL_NS As String = "urn:rfs:values"
Private Const XL_LINE As Long = 4
Private Const XL_COL As Long = 51
Private Const XL_COLSTACK As Long = 52
Private Const XL_PIE As Long = 5

Private Type PxRow
    d As Date
    o As Double
    h As Double
    l As Double
    c As Double
End Type


'--------------------------------------------------------------- helpers
' 블록 저장소: 템플릿 파일 맨 끝 페이지(책갈피 blk_*). 표 경계까지 정확히 잡은 범위를 돌려준다.
Private Function StoreRange(d As Document, ByVal name As String) As Range
    Dim src As Range
    If Not d.Bookmarks.Exists("blk_" & name) Then Exit Function
    Set src = d.Bookmarks("blk_" & name).Range
    If src.Tables.Count > 0 Then
        src.Start = src.Tables(1).Range.Start
        If src.End < src.Tables(1).Range.End Then src.End = src.Tables(1).Range.End
    End If
    Set StoreRange = src
End Function

' [설치용] 템플릿을 열어놓은 상태에서: 저장소 블록들을 워드 정식 '문서 블록'으로 등록
Public Sub RFS_RegisterBlocks(control As IRibbonControl)
    On Error GoTo eh
    Dim names As Variant, k As Variant, t As Template, src As Range, n As Long, x As Template
    If Not ActiveDocument.Bookmarks.Exists("blk_frame2") Then
        MsgBox "블록 저장소가 없는 문서입니다. RFS_Report.dotx(.dotm) 파일 자체를 열고 실행하세요.", vbExclamation, "RFS": Exit Sub
    End If
    For Each x In Application.Templates
        If LCase$(x.FullName) = LCase$(ActiveDocument.FullName) Then Set t = x
    Next x
    If t Is Nothing Then Set t = ActiveDocument.AttachedTemplate
    names = Array("frame1", "frame2", "frame3", "summary", "datatable", "sidenote")
    For Each k In names
        On Error Resume Next
        t.BuildingBlockEntries("RFS_" & k).Delete
        On Error GoTo eh
        Set src = StoreRange(ActiveDocument, CStr(k))
        If k = "sidenote" Then Set src = src.Paragraphs(1).Range
        t.BuildingBlockEntries.Add name:="RFS_" & k, Type:=wdTypeAutoText, Category:="RFS", Range:=src, InsertOptions:=wdInsertContent
        n = n + 1
    Next k
    MsgBox n & "개 블록을 '" & t.name & "'에 등록했습니다. 이제 이 파일을 .dotm으로 저장하세요.", vbInformation, "RFS"
    Exit Sub
eh: fail "블록 등록"
End Sub

' 등록된 문서 블록 찾기: 연결 템플릿 → 열려 있는 템플릿 자신 → 로드된 모든 템플릿
Private Function FindBlock(ByVal name As String) As BuildingBlock
    Dim t As Template, bb As BuildingBlock
    On Error Resume Next
    Set bb = ActiveDocument.AttachedTemplate.BuildingBlockEntries("RFS_" & name)
    If bb Is Nothing Then
        For Each t In Application.Templates
            Set bb = t.BuildingBlockEntries("RFS_" & name)
            If Not bb Is Nothing Then Exit For
        Next t
    End If
    On Error GoTo 0
    Set FindBlock = bb
End Function

Private Sub InsertBlock(ByVal name As String)
    Dim r As Range, cc As ContentControl, src As Range, bb As BuildingBlock
    Set r = FreshParagraph(): If r Is Nothing Then Exit Sub
    r.Collapse wdCollapseStart
    Set bb = FindBlock(name)
    If Not bb Is Nothing Then
        ' 워드 정식 문서 블록 (가장 안정적)
        Set r = bb.Insert(Where:=r, RichText:=True)
    Else
        Set src = StoreRange(ActiveDocument, name)
        If src Is Nothing Then Err.Raise vbObjectError + 3, , "블록 'RFS_" & name & "'이 등록되어 있지 않습니다. RFS_Report.dotm을 열고 [RFS] 탭 → 블록 등록을 실행한 뒤 저장하세요."
        r.FormattedText = src.FormattedText
    End If
    ' 출처 칸의 팀 번호 컨트롤을 표지 값에 연결
    On Error Resume Next
    For Each cc In r.ContentControls
        If cc.Tag = "team_no" Then cc.XMLMapping.SetMapping "/rfs:report[1]/rfs:team_no[1]", "xmlns:rfs='" & RFS_NS & "'"
    Next cc
    r.Collapse wdCollapseEnd
    r.Select
    On Error GoTo 0
End Sub

' 템플릿에서 새 문서를 만들 때: 블록 저장소 페이지 제거 + 뒷장 여백 복원
Public Sub AutoNew()
    On Error Resume Next
    With ActiveDocument
        If .Bookmarks.Exists("RFS_STORE") Then .Bookmarks("RFS_STORE").Range.Delete
        With .Sections(.Sections.Count).PageSetup
            .TopMargin = CentimetersToPoints(1.5): .BottomMargin = CentimetersToPoints(1.5)
            .LeftMargin = CentimetersToPoints(1): .RightMargin = CentimetersToPoints(1)
        End With
        .Saved = False
    End With
End Sub

' 공통 오류 처리: 어느 매크로에서 났는지 같이 보여준다
Private Sub fail(ByVal proc As String)
    MsgBox "매크로: " & proc & vbCrLf & "오류 " & Err.Number & ": " & Err.Description & vbCrLf & vbCrLf & _
           "이 창을 캡처해서 보내주세요.", vbExclamation, "RFS 오류"
End Sub


' 선택한 줄이 한 문단 안에 다른 줄과 Shift+Enter로 붙어 있으면, 그 줄만 문단으로 떼어낸다
Private Sub IsolateSelectedLine()
    On Error Resume Next
    Dim p As Range, r As Range, i As Long, s As Long
    If Selection.Information(wdWithInTable) Then Exit Sub
    Set p = Selection.Paragraphs(1).Range
    If InStr(p.Text, Chr(11)) = 0 Then Exit Sub
    s = Selection.Start
    ' 앞쪽 줄바꿈 → 문단 나누기
    Set r = p.Duplicate: r.End = s
    i = InStrRev(r.Text, Chr(11))
    If i > 0 Then ActiveDocument.Range(p.Start + i - 1, p.Start + i).Text = vbCr
    ' 뒤쪽 줄바꿈 → 문단 나누기
    Set p = Selection.Paragraphs(1).Range
    Set r = p.Duplicate: r.Start = Selection.End
    i = InStr(r.Text, Chr(11))
    If i > 0 Then ActiveDocument.Range(r.Start + i - 1, r.Start + i).Text = vbCr
End Sub

Private Sub ApplyParaStyle(ByVal styleName As String)
    On Error Resume Next
    IsolateSelectedLine
    Selection.Paragraphs(1).Style = ActiveDocument.Styles(styleName)
    If Err.Number <> 0 Then MsgBox "스타일 '" & styleName & "'이(가) 없습니다.", vbExclamation, "RFS"
End Sub

Private Sub ApplyCharStyle(ByVal styleName As String)
    On Error Resume Next
    If Selection.Type = wdSelectionIP Then Selection.Words(1).Select
    Selection.Style = ActiveDocument.Styles(styleName)
End Sub

' 커서 위치를 "빈 문단"으로 만들어 그 범위를 돌려준다 (표 삽입용)
Private Function FreshParagraph() As Range
    Dim r As Range
    If Selection.Information(wdWithInTable) Then
        MsgBox "표 안에서는 삽입할 수 없습니다. 표 바깥 본문에 커서를 두세요.", vbExclamation, "RFS"
        Exit Function
    End If
    Set r = Selection.Paragraphs(1).Range
    If Len(r.Text) > 1 Then
        r.InsertParagraphAfter
        Set r = r.Next(wdParagraph, 1)
    End If
    r.Style = ActiveDocument.Styles("RFS 본문")
    Set FreshParagraph = r
End Function


Private Sub AddField(r As Range, ByVal code As String)
    Dim f As Field
    Set f = ActiveDocument.Fields.Add(Range:=r, Type:=wdFieldEmpty, Text:=code, PreserveFormatting:=False)
    f.ShowCodes = False
    f.Update
End Sub


'--------------------------------------------------------------- 코드로 그리는 블록들



Private Sub BuildHeading1()
    Dim p As Paragraph, r As Range, d As Range, ch As String
    Set p = Selection.Paragraphs(1)
    If Selection.Information(wdWithInTable) Then
        MsgBox "표 안에서는 대제목을 만들 수 없습니다.", vbExclamation, "RFS": Exit Sub
    End If
    IsolateSelectedLine
    Set p = Selection.Paragraphs(1)
    p.Style = wdStyleHeading1
    Set r = p.Range: r.End = r.End - 1
    If Len(r.Text) = 0 Then r.Text = "장 제목 입력"
    ' 기존 필드/로마 숫자/". " 제거
    If p.Range.Fields.Count > 0 Then p.Range.Fields(1).Delete
    Set r = p.Range
    Do While Len(r.Text) > 1
        ch = Left$(r.Text, 1)
        If (AscW(ch) >= &H2160 And AscW(ch) <= &H216B) Or ch = "." Or ch = " " Then
            Set d = r.Duplicate: d.End = d.Start + 1: d.Delete
            Set r = p.Range
        Else
            Exit Do
        End If
    Loop
    ' 앞쪽에 숨은 장 카운터 필드 + 전각 로마 숫자
    Set r = p.Range: r.Collapse wdCollapseStart
    AddField r, "SEQ 장 \h"
    RenumberChapters
    Set r = p.Range: r.End = r.End - 1: r.Select
End Sub

' 문단에서 숨은 SEQ 필드 뒤부터 시작하는 범위
Private Function AfterField(p As Paragraph) As Range
    Dim r As Range, ch As String
    Set r = p.Range
    If p.Range.Fields.Count > 0 Then r.Start = p.Range.Fields(1).Result.End
    ' 필드 구분 문자(19/20/21)를 건너뛴다
    Do While Len(r.Text) > 1
        ch = Left$(r.Text, 1)
        If ch = Chr(19) Or ch = Chr(20) Or ch = Chr(21) Then r.MoveStart wdCharacter, 1 Else Exit Do
    Loop
    Set AfterField = r
End Function

' 대제목 문단의 로마 숫자(Ⅰ Ⅱ Ⅲ ...)를 순서대로 다시 매긴다 (제목 1 스타일만 Find로 바로 찾아감)
Private Sub RenumberChapters()
    Dim f As Range, p As Paragraph, n As Long, r As Range, ch As String, k As Long, d As Range
    Dim su As Boolean: su = Application.ScreenUpdating
    Application.ScreenUpdating = False
    Set f = ActiveDocument.Content
    With f.Find
        .ClearFormatting: .Text = "": .Style = wdStyleHeading1
        .Forward = True: .Wrap = wdFindStop: .Format = True: .MatchWildcards = False
    End With
    Do While f.Find.Execute
        If f.Information(wdWithInTable) Then GoTo nextHit
        Set p = f.Paragraphs(1)
        n = n + 1
        Set r = AfterField(p)
        k = 0
        Do While k < Len(r.Text) - 1
            ch = Mid$(r.Text, k + 1, 1)
            If (AscW(ch) >= &H2160 And AscW(ch) <= &H216B) Or ch = "." Or ch = " " Then k = k + 1 Else Exit Do
        Loop
        If k > 0 Then
            Set d = r.Duplicate: d.End = d.Start + k: d.Delete
        End If
        Set r = AfterField(p)
        r.Collapse wdCollapseStart
        r.InsertBefore ChrW(&H2160 + (n - 1)) & ". "
nextHit:
        f.Start = p.Range.End
        f.End = ActiveDocument.Content.End
        If f.Start >= f.End Then Exit Do
    Loop
    Application.ScreenUpdating = su
End Sub

'--------------------------------------------------------------- 구조
Public Sub RFS_InsertH1(control As IRibbonControl)
    On Error GoTo eh
    Application.ScreenUpdating = False
    BuildHeading1
    Application.ScreenUpdating = True
    Exit Sub
eh: Application.ScreenUpdating = True: fail "대제목"
End Sub
Public Sub RFS_StyleH2(control As IRibbonControl)
    IsolateSelectedLine
    Selection.Paragraphs(1).Style = wdStyleHeading2
End Sub
Public Sub RFS_StyleH3(control As IRibbonControl)
    IsolateSelectedLine
    Selection.Paragraphs(1).Style = wdStyleHeading3
End Sub
Public Sub RFS_StyleBody(control As IRibbonControl)
    ApplyParaStyle "RFS 본문"
End Sub
Public Sub RFS_StyleList(control As IRibbonControl)
    ApplyParaStyle "RFS 글머리"
End Sub
Public Sub RFS_InsertSide(control As IRibbonControl)
    ' 커서가 있는 문단 바로 위에 사이드 노트 문단을 만든다
    Dim r As Range, src As Range, bb As BuildingBlock
    On Error GoTo eh
    If Selection.Information(wdWithInTable) Then
        MsgBox "표 안에서는 사이드 노트를 만들 수 없습니다.", vbExclamation, "RFS": Exit Sub
    End If
    Set r = Selection.Paragraphs(1).Range
    r.Collapse wdCollapseStart
    Set bb = FindBlock("sidenote")
    If Not bb Is Nothing Then
        bb.Insert Where:=r, RichText:=True
    Else
        Set src = StoreRange(ActiveDocument, "sidenote")
        If src Is Nothing Then Err.Raise vbObjectError + 3, , "사이드노트 블록이 등록되어 있지 않습니다. [블록 등록]을 먼저 실행하세요."
        r.FormattedText = src.Paragraphs(1).Range.FormattedText
    End If
    r.Select
    Exit Sub
eh: fail "사이드노트"
End Sub
Public Sub RFS_InsertSummary(control As IRibbonControl)
    On Error GoTo eh
    InsertBlock "summary"
    Exit Sub
eh: fail "요약박스"
End Sub

'--------------------------------------------------------------- 자료 틀
Public Sub RFS_InsertF1(control As IRibbonControl)
    On Error GoTo eh
    InsertBlock "frame1"
    Exit Sub
eh: fail "자료 1단"
End Sub
Public Sub RFS_InsertF2(control As IRibbonControl)
    On Error GoTo eh
    InsertBlock "frame2"
    Exit Sub
eh: fail "자료 2단"
End Sub
Public Sub RFS_InsertF3(control As IRibbonControl)
    On Error GoTo eh
    InsertBlock "frame3"
    Exit Sub
eh: fail "자료 3단"
End Sub
Public Sub RFS_InsertTable(control As IRibbonControl)
    On Error GoTo eh
    InsertBlock "datatable"
    Exit Sub
eh: fail "데이터표"
End Sub

'--------------------------------------------------------------- 강조
Public Sub RFS_Bold(control As IRibbonControl)
    ApplyCharStyle "RFS 강조"
End Sub
Public Sub RFS_Red(control As IRibbonControl)
    ApplyCharStyle "RFS 강조빨강"
End Sub

' 본문 문단의 첫 문장을 'RFS 강조'(KoPub Bold) 문자 스타일로. 이미 강조된 문단은 건너뜀.
Public Sub RFS_FirstSentence(control As IRibbonControl)
    On Error GoTo eh
    Dim p As Paragraph, s As Range, n As Long, scanned As Long, st As String, seen As String
    Dim normalName As String
    normalName = ActiveDocument.Styles(wdStyleNormal).NameLocal
    Application.ScreenUpdating = False
    For Each p In ActiveDocument.Paragraphs
        If p.Range.Information(wdWithInTable) Then GoTo nextP
        st = p.Style
        If Len(p.Range.Text) < 4 Then GoTo nextP
        scanned = scanned + 1
        If scanned <= 6 Then seen = seen & "[" & st & "] "
        If Not (st = "RFS 본문" Or st = normalName Or Left$(st, 6) = "RFS 본문") Then GoTo nextP
        If p.Range.Sentences.Count < 1 Then GoTo nextP
        Set s = p.Range.Sentences(1)
        Do While Len(s.Text) > 1 And (Right$(s.Text, 1) = " " Or Right$(s.Text, 1) = vbCr Or Right$(s.Text, 1) = Chr(11))
            s.MoveEnd wdCharacter, -1
        Loop
        If s.Characters(1).Style = "RFS 강조" Then GoTo nextP
        s.Style = ActiveDocument.Styles("RFS 강조")
        n = n + 1
nextP:
    Next p
    Application.ScreenUpdating = True
    If n = 0 Then
        MsgBox "강조한 문단이 없습니다." & vbCrLf & "검사한 문단: " & scanned & vbCrLf & "앞쪽 문단 스타일: " & seen & vbCrLf & _
               "(본문 스타일 이름이 'RFS 본문' 또는 '" & normalName & "'이 아니면 건너뜁니다)", vbInformation, "RFS"
    Else
        MsgBox n & "개 문단의 첫 문장을 강조했습니다.", vbInformation, "RFS"
    End If
    Exit Sub
eh: Application.ScreenUpdating = True: fail "첫문장 볼드"
End Sub

' 선택 글자에 글꼴 적용 (커서만 있으면 단어 하나)
Private Sub ApplyFont(ByVal f As String)
    On Error Resume Next
    If Selection.Type = wdSelectionIP Then Selection.Words(1).Select
    With Selection.Font
        .name = f: .NameFarEast = f: .NameAscii = f: .NameOther = f
    End With
End Sub
Public Sub RFS_FontBold(control As IRibbonControl)
    ApplyFont "KoPubWorld돋움체 Bold"
End Sub
Public Sub RFS_FontMedium(control As IRibbonControl)
    ApplyFont "KoPubWorld돋움체 Medium"
End Sub
Public Sub RFS_FontLight(control As IRibbonControl)
    ApplyFont "KoPubWorld돋움체 Light"
End Sub
Public Sub RFS_FontYoon(control As IRibbonControl)
    ApplyFont "Yoon 윤고딕 540_TT"
End Sub

'--------------------------------------------------------------- 엑셀 → 표지·재무제표
Public Sub RFS_FillFromExcel(control As IRibbonControl)
    On Error GoTo eh
    Dim fd As FileDialog, path As String
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    fd.Title = "표준 모델 엑셀 파일 선택"
    fd.Filters.Clear: fd.Filters.Add "Excel", "*.xlsx;*.xlsm"
    If fd.Show <> -1 Then Exit Sub
    path = fd.SelectedItems(1)

    Dim xl As Object, wb As Object
    On Error Resume Next
    Set xl = GetObject(, "Excel.Application")
    If xl Is Nothing Then Set xl = CreateObject("Excel.Application")
    On Error GoTo 0
    Set wb = xl.Workbooks.Open(path, ReadOnly:=True, UpdateLinks:=0)

    Dim part As CustomXMLPart
    Set part = ActiveDocument.CustomXMLParts.SelectByNamespace(RFS_NS)(1)
    part.NamespaceManager.AddNamespace "rfs", RFS_NS

    Dim keys As Variant, k As Variant, nd As CustomXMLNode, filled As Long, missing As String
    keys = Array("company", "ticker", "sector", "pub_date", "headline", "rating", "target_price", "current_price", _
                 "price_date", "upside", "index_name", "index_value", "index2_name", "index2_value", "px_unit", "mktcap", "shares", "high52", "low52", "div_yield", _
                 "holder1", "holder1_pct", "holder2", "holder2_pct", "ret1m", "ret6m", "ret12m", "team_no", "fund_unit")
    For Each k In keys
        Set nd = part.SelectSingleNode("/rfs:report/rfs:" & k)
        If Not nd Is Nothing Then
            On Error Resume Next
            nd.Text = wb.names(CStr(k)).RefersToRange.Text
            If Err.Number <> 0 Then missing = missing & k & " ": Err.Clear Else filled = filled + 1
            On Error GoTo 0
        End If
    Next k

    Dim tbls As Variant, t As Variant, cnt As Long
    tbls = Array("tblFund", "tblIS", "tblBS", "tblCF", "tblVal", "tblTeam")
    For Each t In tbls
        If FillTable(wb, CStr(t)) Then cnt = cnt + 1 Else missing = missing & t & " "
    Next t

    Dim nv As Long
    nv = StoreAllNames(wb)
    wb.Close SaveChanges:=False
    RFS_UpdateAll Nothing
    MsgBox "표지 항목 " & filled & "개, 표 " & cnt & "개를 채웠습니다. 모델 값 " & nv & "개 저장(본문에 [모델 값] 버튼으로 꽂기)." & _
           IIf(missing <> "", vbCrLf & "엑셀에 이름이 없어 건너뜀: " & missing, ""), vbInformation, "RFS"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "엑셀→표지·재무"
End Sub

Private Function FillTable(wb As Object, ByVal key As String) As Boolean
    ' 워드 책갈피(key)가 있는 셀을 기준점으로, 엑셀 범위(key)를 같은 모양으로 덮어쓴다
    On Error GoTo fail
    Dim rng As Object, bm As Range, tb As Table, i As Long, j As Long, r0 As Long, c0 As Long
    Set rng = wb.names(key).RefersToRange
    Set bm = ActiveDocument.Bookmarks(key).Range
    If Not bm.Information(wdWithInTable) Then Exit Function
    Set tb = bm.Tables(1)
    r0 = bm.Cells(1).RowIndex: c0 = bm.Cells(1).ColumnIndex
    For i = 1 To rng.rows.Count
        For j = 1 To rng.Columns.Count
            On Error Resume Next
            tb.cell(r0 + i - 1, c0 + j - 1).Range.Text = rng.Cells(i, j).Text
            On Error GoTo fail
        Next j
    Next i
    ' 책갈피가 덮어쓰기로 사라졌으면 다시 만든다
    On Error Resume Next
    ActiveDocument.Bookmarks.Add key, tb.cell(r0, c0).Range
    On Error GoTo 0
    FillTable = True
    Exit Function
fail:
    FillTable = False
End Function

'--------------------------------------------------------------- 필드·목차 갱신
Public Sub RFS_UpdateAll(control As IRibbonControl)
    On Error GoTo eh
    Dim sr As Range, toc As TableOfContents
    Application.ScreenUpdating = False
    RenumberChapters
    For Each sr In ActiveDocument.StoryRanges
        sr.Fields.Update
    Next sr
    For Each toc In ActiveDocument.TablesOfContents
        toc.Update
    Next toc
    Application.ScreenUpdating = True
    Exit Sub
eh: Application.ScreenUpdating = True: fail "필드·목차 갱신"
End Sub

'--------------------------------------------------------------- 양식 점검
Public Sub RFS_Check(control As IRibbonControl)
    On Error GoTo eh
    Dim p As Paragraph, normalName As String, bad As Long, h1bad As Long, fontBad As Long
    normalName = ActiveDocument.Styles(wdStyleNormal).NameLocal
    Application.ScreenUpdating = False
    With ActiveDocument.Content.Find
        .ClearFormatting: .Highlight = True: .Text = "": .Replacement.ClearFormatting: .Replacement.Highlight = False
        .Execute Replace:=wdReplaceAll
    End With
    For Each p In ActiveDocument.Paragraphs
        If p.Range.Information(wdWithInTable) Then GoTo nextP
        If Len(p.Range.Text) > 2 And p.Style = normalName Then
            p.Range.HighlightColorIndex = wdYellow: bad = bad + 1
        End If
        If p.OutlineLevel = wdOutlineLevel1 Then
            If p.Range.Fields.Count = 0 Then p.Range.HighlightColorIndex = wdPink: h1bad = h1bad + 1
        End If
nextP:
    Next p
    Dim w As Range, fn As String
    For Each w In ActiveDocument.Content.Words
        fn = w.Font.NameFarEast
        If fn <> "" And InStr(fn, "KoPubWorld") = 0 And InStr(fn, "윤고딕") = 0 And Trim(w.Text) <> "" Then
            w.HighlightColorIndex = wdTurquoise: fontBad = fontBad + 1
        End If
    Next w
    Dim splitN As Long
    splitN = CheckFrameSplit()
    Application.ScreenUpdating = True
    MsgBox "스타일 없는 본문 문단(노랑): " & bad & vbCrLf & _
           "장 번호 필드 없는 대제목(분홍): " & h1bad & " → 대제목 버튼으로 다시 만들면 해결" & vbCrLf & _
           "허용 글꼴 외 단어(청록): " & fontBad & vbCrLf & _
           "페이지에 걸친 자료 틀(보라): " & splitN & " → 앞 문단을 줄이거나 틀 앞에 페이지 나누기" & vbCrLf & vbCrLf & _
           "고친 뒤 다시 '양식 점검'을 누르면 표시가 지워집니다.", vbInformation, "RFS 양식 점검"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "양식 점검"
End Sub

'--------------------------------------------------------------- 내용 점검 (빈칸·숫자·표기)
Private Function HiliteAll(ByVal pat As Boolean, ByVal txt As String, ByVal color As WdColorIndex) As Long
    Dim r As Range, n As Long
    Set r = ActiveDocument.Content
    With r.Find
        .ClearFormatting: .Text = txt: .MatchWildcards = pat: .Forward = True: .Wrap = wdFindStop: .Format = False
    End With
    Do While r.Find.Execute
        r.HighlightColorIndex = color: n = n + 1
        r.Collapse wdCollapseEnd
    Loop
    HiliteAll = n
End Function

Private Function CoverValue(ByVal key As String) As String
    On Error Resume Next
    Dim part As CustomXMLPart, nd As CustomXMLNode
    Set part = ActiveDocument.CustomXMLParts.SelectByNamespace(RFS_NS)(1)
    part.NamespaceManager.AddNamespace "rfs", RFS_NS
    Set nd = part.SelectSingleNode("/rfs:report/rfs:" & key)
    If Not nd Is Nothing Then CoverValue = nd.Text
End Function

Private Function DigitsOnly(ByVal t As String) As String
    Dim i As Long, ch As String, o As String
    For i = 1 To Len(t)
        ch = Mid$(t, i, 1)
        If ch Like "[0-9.]" Then o = o & ch
    Next i
    DigitsOnly = o
End Function

' 본문에서 '라벨 + 숫자' 패턴을 찾아 표지 값과 다르면 표시 (타이핑된 것만; 연결 컨트롤은 건너뜀)
Private Function CheckNumber(ByVal pattern As String, ByVal coverKey As String) As Long
    Dim r As Range, n As Long, want As String
    want = DigitsOnly(CoverValue(coverKey))
    If want = "" Then Exit Function
    Set r = ActiveDocument.Content
    With r.Find
        .ClearFormatting: .Text = pattern: .MatchWildcards = True: .Forward = True: .Wrap = wdFindStop
    End With
    Do While r.Find.Execute
        If r.ContentControls.Count = 0 Then
            If DigitsOnly(r.Text) <> want Then r.HighlightColorIndex = wdBrightGreen: n = n + 1
        End If
        r.Collapse wdCollapseEnd
    Loop
    CheckNumber = n
End Function

Public Sub RFS_CheckContent(control As IRibbonControl)
    On Error GoTo eh
    Dim blank As Long, num As Long, nota As Long
    Application.ScreenUpdating = False
    With ActiveDocument.Content.Find
        .ClearFormatting: .Highlight = True: .Text = "": .Replacement.ClearFormatting: .Replacement.Highlight = False
        .Execute Replace:=wdReplaceAll
    End With
    ' 1) 빈칸
    blank = blank + HiliteAll(False, "제목 입력", wdYellow)
    blank = blank + HiliteAll(False, "여기에 차트/표 붙여넣기", wdYellow)
    blank = blank + HiliteAll(False, "출처: ,", wdYellow)
    blank = blank + HiliteAll(False, "(단위: )", wdYellow)
    ' 2) 숫자 (표지 값과 비교)
    num = num + CheckNumber("목표주가 [0-9,.]@원", "target_price") + CheckNumber("목표주가[0-9,.]@원", "target_price")
    num = num + CheckNumber("목표 주가 [0-9,.]@원", "target_price") + CheckNumber("목표 주가[0-9,.]@원", "target_price")
    num = num + CheckNumber("상승여력 [0-9.]@%", "upside") + CheckNumber("상승여력[0-9.]@%", "upside")
    num = num + CheckNumber("상승 여력 [0-9.]@%", "upside") + CheckNumber("상승 여력[0-9.]@%", "upside")
    num = num + CheckNumber("현재주가 [0-9,.]@원", "current_price") + CheckNumber("현재주가[0-9,.]@원", "current_price")
    ' 3) 표기 규칙
    nota = nota + HiliteAll(True, "20[0-9]{2}년", wdTurquoise)          ' 2025년 -> '25년
    nota = nota + HiliteAll(True, "[1-4]분기", wdTurquoise)             ' 3분기 -> 3Q25
    nota = nota + HiliteAll(True, "\( ", wdTurquoise)                   ' 괄호 안 공백
    nota = nota + HiliteAll(True, " \)", wdTurquoise)
    nota = nota + HiliteAll(True, "[0-9]억원", wdTurquoise)              ' 억원 -> 억 원
    Application.ScreenUpdating = True
    MsgBox "빈칸(노랑): " & blank & vbCrLf & _
           "표지 값과 다른 숫자(연두): " & num & vbCrLf & _
           "표기 규칙(청록): " & nota & vbCrLf & vbCrLf & _
           "형광펜은 표시만 합니다. 고친 뒤 다시 누르면 지워집니다.", vbInformation, "RFS 내용 점검"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "내용 점검"
End Sub

'--------------------------------------------------------------- PDF 내보내기
' 파일명 규칙: [학기]_회사_Research_Team_N_밸류_YYMMDD.pdf  (예: [25-2]_테크윙_Research_Team_2_PER_251130.pdf)
Public Sub RFS_ExportPDF(control As IRibbonControl)
    On Error GoTo eh
    Dim term As String, val As String, comp As String, team As String, d As String, fn As String, folder As String
    If ActiveDocument.path = "" Then
        MsgBox "먼저 문서를 저장하세요. PDF는 문서와 같은 폴더에 만들어집니다.", vbExclamation, "RFS": Exit Sub
    End If
    If ActiveDocument.Bookmarks.Exists("RFS_STORE") Then
        MsgBox "이 파일은 템플릿 자체입니다. 새로 만들기 > 개인 > RFS_Report 로 만든 문서에서 실행하세요.", vbExclamation, "RFS": Exit Sub
    End If
    On Error Resume Next
    term = ActiveDocument.Variables("RFS_TERM").value
    val = ActiveDocument.Variables("RFS_VAL").value
    On Error GoTo eh
    term = InputBox("학기 표기 (예: 26-1)", "RFS PDF 내보내기", IIf(term = "", "26-1", term))
    If term = "" Then Exit Sub
    val = InputBox("밸류에이션 방식 (예: PER, EVEBITDA, DCF)", "RFS PDF 내보내기", IIf(val = "", "PER", val))
    If val = "" Then Exit Sub
    ActiveDocument.Variables("RFS_TERM").value = term
    ActiveDocument.Variables("RFS_VAL").value = val
    comp = Replace(Replace(Replace(CoverValue("company"), " ", "_"), ".", ""), ",", "")
    team = CoverValue("team_no")
    d = Replace(CoverValue("pub_date"), ".", "")
    If Len(d) = 8 Then d = Mid$(d, 3)              ' 20251130 -> 251130
    fn = "[" & term & "]_" & comp & "_Research_Team_" & team & "_" & val & "_" & d & ".pdf"
    folder = ActiveDocument.path & "\"
    Application.ScreenUpdating = False
    RFS_UpdateAll Nothing
    Application.ScreenUpdating = True
    ActiveDocument.ExportAsFixedFormat OutputFileName:=folder & fn, ExportFormat:=wdExportFormatPDF, _
        OpenAfterExport:=True, OptimizeFor:=wdExportOptimizeForPrint, Range:=wdExportAllDocument, _
        Item:=wdExportDocumentContent, IncludeDocProps:=True, KeepIRM:=False, CreateBookmarks:=wdExportCreateHeadingBookmarks, _
        DocStructureTags:=True, BitmapMissingFonts:=True, UseISO19005_1:=False
    MsgBox "PDF 저장: " & fn & vbCrLf & folder, vbInformation, "RFS"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "PDF 내보내기"
End Sub

'=============================================================== 주가 차트 + Stock Data 자동화
' 표지의 Stock Price 차트(테크윙 서식 그대로)에 1년치 종가를 갈아끼우고,
' 현재주가·기준일·52주 고저·1/6/12개월 수익률·지수·시총·발행주식수·배당수익률을 표지에 채운다.
' 데이터: 국내 = 네이버 금융, 미국 = Stooq, 실패 시 Investing.com CSV 선택.


Private Function HttpGet(ByVal url As String, Optional ByVal charset As String = "") As String
    Dim h As Object, st As Object
    Set h = CreateObject("MSXML2.XMLHTTP.6.0")
    h.Open "GET", url, False
    h.setRequestHeader "User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    h.send
    If h.Status <> 200 Then Err.Raise vbObjectError + 10, , "HTTP " & h.Status & vbCrLf & url
    If charset = "" Then
        HttpGet = h.responseText
    Else
        Dim txt As String
        Set st = CreateObject("ADODB.Stream")
        st.Type = 1: st.Open: st.Write h.responseBody
        st.Position = 0: st.Type = 2: st.charset = "utf-8"
        txt = st.ReadText
        If InStr(txt, "상장주식수") = 0 Then         ' UTF-8이 아니면 EUC-KR로 다시
            st.Position = 0: st.Type = 2: st.charset = "euc-kr"
            txt = st.ReadText
        End If
        st.Close
        HttpGet = txt
    End If
End Function

Private Sub SetCover(ByVal key As String, ByVal value As String)
    On Error Resume Next
    Dim part As CustomXMLPart, nd As CustomXMLNode
    Set part = ActiveDocument.CustomXMLParts.SelectByNamespace(RFS_NS)(1)
    part.NamespaceManager.AddNamespace "rfs", RFS_NS
    Set nd = part.SelectSingleNode("/rfs:report/rfs:" & key)
    If Not nd Is Nothing Then nd.Text = value
End Sub

' --- 네이버 금융 (국내 종목/지수): symbol = 6자리 코드 또는 KOSPI / KOSDAQ
Private Function FetchNaver(ByVal symbol As String, ByVal d1 As Date, ByVal d2 As Date, rows() As PxRow) As Long
    Dim url As String, body As String, re As Object, m As Object, n As Long, i As Long
    url = "https://api.finance.naver.com/siseJson.naver?symbol=" & symbol & "&requestType=1&startTime=" & Format(d1, "yyyymmdd") & _
          "&endTime=" & Format(d2, "yyyymmdd") & "&timeframe=day"
    body = HttpGet(url)
    Set re = CreateObject("VBScript.RegExp")
    re.Global = True
    re.pattern = """(\d{8})""\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)"
    Set m = re.Execute(body)
    ReDim rows(1 To IIf(m.Count = 0, 1, m.Count))
    For i = 0 To m.Count - 1
        n = n + 1
        With rows(n)
            .d = DateSerial(CInt(Left$(m(i).SubMatches(0), 4)), CInt(Mid$(m(i).SubMatches(0), 5, 2)), CInt(Right$(m(i).SubMatches(0), 2)))
            .o = val(m(i).SubMatches(1)): .h = val(m(i).SubMatches(2)): .l = val(m(i).SubMatches(3)): .c = val(m(i).SubMatches(4))
        End With
    Next i
    FetchNaver = n
End Function

' --- Stooq (미국 종목/지수): symbol 예 ttwo.us, ^ndq, ^spx
Private Function FetchStooq(ByVal symbol As String, ByVal d1 As Date, ByVal d2 As Date, rows() As PxRow) As Long
    Dim body As String, lines() As String, f() As String, i As Long, n As Long
    body = HttpGet("https://stooq.com/q/d/l/?s=" & symbol & "&i=d&d1=" & Format(d1, "yyyymmdd") & "&d2=" & Format(d2, "yyyymmdd"))
    lines = Split(Replace(body, vbCr, ""), vbLf)
    ReDim rows(1 To UBound(lines) + 1)
    For i = 1 To UBound(lines)
        If InStr(lines(i), ",") > 0 Then
            f = Split(lines(i), ",")
            If UBound(f) >= 4 And IsDate(f(0)) Then
                n = n + 1
                With rows(n)
                    .d = CDate(f(0)): .o = val(f(1)): .h = val(f(2)): .l = val(f(3)): .c = val(f(4))
                End With
            End If
        End If
    Next i
    FetchStooq = n
End Function

' --- Investing.com 과거 데이터 CSV (날짜, 종가, 오픈, 고가, 저가, ...)
Private Function FetchInvestingCsv(rows() As PxRow) As Long
    Dim fd As FileDialog, st As Object, body As String, lines() As String, f() As String, i As Long, n As Long, ln As String, ds As String
    Set fd = Application.FileDialog(msoFileDialogFilePicker)
    fd.Title = "Investing.com 과거 데이터 CSV 선택": fd.Filters.Clear: fd.Filters.Add "CSV", "*.csv"
    If fd.Show <> -1 Then Exit Function
    Set st = CreateObject("ADODB.Stream")
    st.Type = 2: st.charset = "utf-8": st.Open: st.LoadFromFile fd.SelectedItems(1)
    body = st.ReadText: st.Close
    lines = Split(Replace(body, vbCr, ""), vbLf)
    ReDim rows(1 To UBound(lines) + 1)
    For i = 1 To UBound(lines)
        ln = Trim$(lines(i))
        If Len(ln) > 10 Then
            If Left$(ln, 1) = """" Then ln = Mid$(ln, 2)
            If Right$(ln, 1) = """" Then ln = Left$(ln, Len(ln) - 1)
            f = Split(ln, """,""")
            If UBound(f) >= 4 Then
                ds = Replace(Replace(Replace(f(0), " ", ""), ".", "-"), "/", "-")
                If IsDate(ds) Then
                    n = n + 1
                    With rows(n)
                        .d = CDate(ds): .c = val(Replace(f(1), ",", "")): .o = val(Replace(f(2), ",", ""))
                        .h = val(Replace(f(3), ",", "")): .l = val(Replace(f(4), ",", ""))
                    End With
                End If
            End If
        End If
    Next i
    FetchInvestingCsv = n
End Function

' 날짜 오름차순 정렬 (삽입 정렬, 300행 이하)
Private Sub SortRows(rows() As PxRow, ByVal n As Long)
    Dim i As Long, j As Long, t As PxRow
    For i = 2 To n
        t = rows(i): j = i - 1
        Do While j >= 1
            If rows(j).d <= t.d Then Exit Do
            rows(j + 1) = rows(j): j = j - 1
        Loop
        rows(j + 1) = t
    Next i
End Sub

Private Function CloseOnOrBefore(rows() As PxRow, ByVal n As Long, ByVal target As Date) As Double
    Dim i As Long
    For i = n To 1 Step -1
        If rows(i).d <= target Then CloseOnOrBefore = rows(i).c: Exit Function
    Next i
    CloseOnOrBefore = rows(1).c
End Function

Private Function PctStr(ByVal a As Double, ByVal b As Double) As String
    Dim r As Double
    If b = 0 Then Exit Function
    r = a / b - 1
    PctStr = IIf(r >= 0, "+", "") & Format(r, "0.00%")
End Function

' 표지 첫 섹션의 차트(Stock Price)에 데이터 교체
Private Sub UpdateStockChart(rows() As PxRow, ByVal n As Long, ByVal numFmt As String)
    Dim ish As InlineShape, ch As Object, wb As Object, ws As Object, i As Long, found As Boolean
    For Each ish In ActiveDocument.Sections(1).Range.InlineShapes
        If ish.Type = wdInlineShapeChart Then Set ch = ish.Chart: found = True: Exit For
    Next ish
    If Not found Then Err.Raise vbObjectError + 11, , "표지에서 Stock Price 차트를 찾지 못했습니다."
    ch.ChartData.Activate
    Set wb = ch.ChartData.Workbook
    On Error Resume Next
    wb.Application.Visible = False
    On Error GoTo 0
    Set ws = wb.Worksheets(1)
    ws.Cells.ClearContents
    ws.Cells(1, 1).value = "날짜": ws.Cells(1, 2).value = "종가"
    For i = 1 To n
        ws.Cells(i + 1, 1).value = rows(i).d
        ws.Cells(i + 1, 2).value = rows(i).c
    Next i
    ws.Columns(1).NumberFormat = "m/d/yyyy"
    ws.Columns(2).NumberFormat = numFmt
    ch.SeriesCollection(1).XValues = "='" & ws.name & "'!$A$2:$A$" & (n + 1)
    ch.SeriesCollection(1).Values = "='" & ws.name & "'!$B$2:$B$" & (n + 1)
    On Error Resume Next
    With ch.Axes(1)                       ' 날짜축: 4개월 간격
        .MajorUnitScale = 3: .MajorUnit = 4
        .TickLabels.NumberFormat = "[$-409]mmm-yy;@"
    End With
    With ch.Axes(2)                       ' 값축: 자동
        .MinimumScaleIsAuto = True: .MaximumScaleIsAuto = True: .MajorUnitIsAuto = True
        .TickLabels.NumberFormat = numFmt
    End With
    On Error GoTo 0
    wb.Close
End Sub

' 네이버 종목 페이지에서 시총 / 상장주식수 / 배당수익률
Private Sub FetchNaverInfo(ByVal code As String)
    On Error Resume Next
    Dim html As String, re As Object, m As Object, s As String
    html = HttpGet("https://finance.naver.com/item/main.naver?code=" & code, "euc-kr")
    Set re = CreateObject("VBScript.RegExp"): re.Global = False
    re.pattern = "id=""_market_sum""[^>]*>([\s\S]*?)</em>"
    Set m = re.Execute(html)
    If m.Count > 0 Then
        s = Replace(Replace(Replace(m(0).SubMatches(0), vbTab, " "), vbCr, " "), vbLf, " ")
        Do While InStr(s, "  ") > 0: s = Replace(s, "  ", " "): Loop
        s = Trim$(s)
        If s <> "" Then SetCover "mktcap", s & "억"
    End If
    re.pattern = "상장주식수[\s\S]*?<em>\s*([\d,]+)\s*</em>"
    Set m = re.Execute(html)
    If m.Count > 0 Then SetCover "shares", m(0).SubMatches(0)
    re.pattern = "id=""_dvr""[^>]*>\s*([\d.]+)\s*<"
    Set m = re.Execute(html)
    If m.Count > 0 Then SetCover "div_yield", m(0).SubMatches(0) & "%"
End Sub

Public Sub RFS_StockChart(control As IRibbonControl)
    On Error GoTo eh
    Dim tk As String, code As String, isKR As Boolean, rows() As PxRow, n As Long, idx() As PxRow, ni As Long
    Dim d1 As Date, d2 As Date, i As Long, hi As Double, lo As Double, last As Double, lastD As Date, numFmt As String, cur As String
    tk = Trim$(CoverValue("ticker"))
    If tk = "" Then MsgBox "표지의 티커가 비어 있습니다 (예: 089030.KQ, TTWO).", vbExclamation, "RFS": Exit Sub
    code = tk
    If InStr(tk, ".") > 0 Then code = Left$(tk, InStr(tk, ".") - 1)
    isKR = (Len(code) = 6 And IsNumeric(code))
    d2 = Date: d1 = DateAdd("yyyy", -1, d2)
    Application.ScreenUpdating = False
    ' 1) 가격 데이터
    Dim lastErr As String
    On Error Resume Next
    If isKR Then
        n = FetchNaver(code, d1, d2, rows)
        If Err.Number <> 0 Then lastErr = "Naver: " & Err.Description: Err.Clear
    Else
        n = FetchUS(code, d1, d2, rows, lastErr)
    End If
    On Error GoTo eh
    If n < 20 Then
        Application.ScreenUpdating = True
        If MsgBox("인터넷에서 주가를 받지 못했습니다." & vbCrLf & lastErr & vbCrLf & vbCrLf & "Investing.com 과거 데이터 CSV를 직접 고르시겠습니까?", vbYesNo + vbQuestion, "RFS") = vbYes Then
            n = FetchInvestingCsv(rows)
        End If
        If n < 20 Then Exit Sub
        Application.ScreenUpdating = False
    End If
    SortRows rows, n
    ' 2) 차트
    numFmt = IIf(isKR, "#,##0", "#,##0.00")
    UpdateStockChart rows, n, numFmt
    ' 3) Stock Data
    last = rows(n).c: lastD = rows(n).d
    hi = rows(1).h: lo = rows(1).l
    For i = 1 To n
        If rows(i).h > hi Then hi = rows(i).h
        If rows(i).l < lo And rows(i).l > 0 Then lo = rows(i).l
    Next i
    If isKR Then cur = Format(last, "#,##0") & "원" Else cur = "$" & Format(last, "#,##0.00")
    SetCover "current_price", cur
    SetCover "px_unit", IIf(isKR, "원", "달러")
    SetCover "price_date", Format(lastD, "mm.dd")
    SetCover "high52", Format(hi, IIf(isKR, "#,##0", "#,##0.00"))
    SetCover "low52", Format(lo, IIf(isKR, "#,##0", "#,##0.00"))
    SetCover "ret1m", PctStr(last, CloseOnOrBefore(rows, n, DateAdd("m", -1, lastD)))
    SetCover "ret6m", PctStr(last, CloseOnOrBefore(rows, n, DateAdd("m", -6, lastD)))
    SetCover "ret12m", PctStr(last, rows(1).c)
    ' 지수
    On Error Resume Next
    If isKR Then
        ni = FetchNaver("KOSPI", DateAdd("d", -10, d2), d2, idx)
        If ni > 0 Then SetCover "index_name", "KOSPI": SetCover "index_value", Format(idx(ni).c, "#,##0.00")
        ni = FetchNaver("KOSDAQ", DateAdd("d", -10, d2), d2, idx)
        If ni > 0 Then SetCover "index2_name", "KOSDAQ": SetCover "index2_value", Format(idx(ni).c, "#,##0.00")
        FetchNaverInfo code
    Else
        ni = FetchYahoo("^IXIC", DateAdd("d", -10, d2), d2, idx)
        If ni > 0 Then SetCover "index_name", "NASDAQ": SetCover "index_value", Format(idx(ni).c, "#,##0.00")
        ni = FetchYahoo("^GSPC", DateAdd("d", -10, d2), d2, idx)
        If ni > 0 Then SetCover "index2_name", "S&P 500": SetCover "index2_value", Format(idx(ni).c, "#,##0.00")
    End If
    On Error GoTo eh
    Application.ScreenUpdating = True
    MsgBox "주가 차트 " & n & "거래일 갱신 (" & Format(rows(1).d, "yyyy.mm.dd") & " " & Format(rows(1).c, "#,##0.##") & " ~ " & Format(lastD, "yyyy.mm.dd") & " " & Format(last, "#,##0.##") & ")" & vbCrLf & _
           "현재주가 " & cur & ", 52주 " & Format(hi, "#,##0") & "/" & Format(lo, "#,##0") & vbCrLf & _
           "1/6/12개월 수익률과 지수" & IIf(isKR, ", 시총·주식수·배당", "") & "을 표지에 채웠습니다." & vbCrLf & _
           "(시총·주식수는 네이버 값이니 발간일 기준으로 한 번 확인)", vbInformation, "RFS"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "주가 차트"
End Sub

'=============================================================== 본문 차트 5종 (RFS 서식)
' 엑셀에서 범위 복사(첫 행=계열 이름, 첫 열=항목) → 자료 틀 가운데 칸에 커서 → 버튼

Private Function HexRGB(ByVal h As String) As Long
    HexRGB = RGB(val("&H" & Mid$(h, 1, 2)), val("&H" & Mid$(h, 3, 2)), val("&H" & Mid$(h, 5, 2)))
End Function

Private Function Palette(ByVal i As Long) As Long
    Dim p As Variant
    p = Array("203864", "D0CECE", "2F5597", "8FAADC", "B4C7E7", "E7E6E6", "595959", "C00000")
    Palette = HexRGB(p((i - 1) Mod (UBound(p) + 1)))
End Function

Private Function ClipText() As String
    On Error Resume Next
    Dim d As Object
    Set d = CreateObject("new:{1C3B4210-F441-11CE-B9EA-00AA006B1A69}")
    d.GetFromClipboard
    ClipText = d.GetText(1)
End Function

' 클립보드 TSV → 2차원 배열 (1행 헤더, 1열 항목)
Private Function ParseClip(ByRef grid() As String, ByRef nr As Long, ByRef nc As Long) As Boolean
    Dim txt As String, lines() As String, f() As String, i As Long, j As Long, k As Long
    txt = Replace(ClipText(), vbCr, "")
    Do While Right$(txt, 1) = vbLf: txt = Left$(txt, Len(txt) - 1): Loop
    If Len(txt) = 0 Then Exit Function
    lines = Split(txt, vbLf)
    nr = UBound(lines) + 1
    nc = UBound(Split(lines(0), vbTab)) + 1
    If nr < 2 Or nc < 2 Then Exit Function
    ReDim grid(1 To nr, 1 To nc)
    For i = 0 To nr - 1
        f = Split(lines(i), vbTab)
        For j = 0 To nc - 1
            If j <= UBound(f) Then grid(i + 1, j + 1) = Trim$(f(j))
        Next j
    Next i
    ParseClip = True
End Function

Private Function ToNum(ByVal s As String) As Variant
    s = Replace(Replace(Replace(s, ",", ""), "%", ""), " ", "")
    If s = "" Or s = "-" Then ToNum = Empty: Exit Function
    If Left$(s, 1) = "(" And Right$(s, 1) = ")" Then s = "-" & Mid$(s, 2, Len(s) - 2)
    If IsNumeric(s) Then ToNum = CDbl(s) Else ToNum = s
End Function

Private Sub StyleAxis(ax As Object, ByVal fontSize As Single)
    On Error Resume Next
    ax.Border.LineStyle = 1: ax.Border.color = RGB(0, 0, 0)
    ax.Format.Line.Visible = True
    ax.Format.Line.ForeColor.RGB = RGB(0, 0, 0)
    ax.Format.Line.Weight = 0.25              ' 양식: 가로·세로축 0.25pt (마지막에 둬야 덮어쓰이지 않음)
    ax.MajorTickMark = 2                      ' inside
    ax.MinorTickMark = -4142                  ' none
    ax.HasMajorGridlines = False
    ax.HasMinorGridlines = False
    ax.TickLabels.Font.name = "KoPubWorld돋움체 Medium"
    ax.TickLabels.Font.Size = fontSize
    ax.TickLabels.Font.color = RGB(0, 0, 0)
End Sub

Private Sub MakeChart(ByVal kind As String)
    Dim grid() As String, nr As Long, nc As Long
    If Not Selection.Information(wdWithInTable) Then
        MsgBox "자료 틀의 가운데 칸(차트 자리)에 커서를 두고 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    If Not ParseClip(grid, nr, nc) Then
        MsgBox "먼저 엑셀에서 데이터 범위를 복사(Ctrl+C)하세요." & vbCrLf & "첫 행 = 계열 이름(A1은 비워도 됨), 첫 열 = 항목/날짜, 2행 이상·2열 이상.", vbExclamation, "RFS": Exit Sub
    End If
    MakeChartFromGrid kind, grid, nr, nc
End Sub

Private Sub MakeChartFromGrid(ByVal kind As String, grid() As String, ByVal nr As Long, ByVal nc As Long)
    Dim i As Long, j As Long
    Dim cell As cell, r As Range, ish As InlineShape, ch As Object, wb As Object, ws As Object
    Dim w As Single, h As Single, nser As Long, ser As Object, v As Variant, pct As Boolean
    nser = nc - 1
    If kind = "pie" Then nser = 1
    Set cell = Selection.Cells(1)
    w = cell.Width - 6
    h = cell.Height
    If h < 60 Or h > 2000 Then h = CentimetersToPoints(IIf(w > CentimetersToPoints(15), 6, 3.5))
    If kind = "combo" And nser < 2 Then
        MsgBox "막대+선 차트는 계열이 2개 이상이어야 합니다 (마지막 계열이 선·오른쪽 축).", vbExclamation, "RFS": Exit Sub
    End If
    Application.ScreenUpdating = False
    ' 자리 표시 문구 제거 후 차트 삽입
    Set r = cell.Range: r.End = r.End - 1: r.Text = ""
    Set r = cell.Range: r.End = r.End - 1
    Set ish = r.InlineShapes.AddChart2(Style:=-1, Type:=IIf(kind = "pie", XL_PIE, IIf(kind = "stacked", XL_COLSTACK, IIf(kind = "line", XL_LINE, XL_COL))), _
                                       Range:=r, NewLayout:=False)
    ish.LockAspectRatio = False
    ish.Width = w: ish.Height = h
    Set ch = ish.Chart
    ' 데이터
    ch.ChartData.Activate
    Set wb = ch.ChartData.Workbook
    On Error Resume Next
    wb.Application.Visible = False
    On Error GoTo 0
    Set ws = wb.Worksheets(1)
    ws.Cells.Clear
    For i = 1 To nr
        For j = 1 To nc
            If i = 1 Or j = 1 Then
                If i = 1 Then ws.Cells(i, j).NumberFormat = "@"
                ws.Cells(i, j).value = grid(i, j)
            Else
                v = ToNum(grid(i, j))
                If Not IsEmpty(v) Then ws.Cells(i, j).value = v
            End If
        Next j
    Next i
    ch.SetSourceData Source:="='" & ws.name & "'!" & ws.Range(ws.Cells(1, 1), ws.Cells(nr, IIf(kind = "pie", 2, nc))).Address, PlotBy:=2   ' xlColumns
    wb.Close
    ' 서식
    On Error Resume Next
    ch.HasTitle = False
    ch.ChartArea.Format.Fill.Visible = False
    ch.ChartArea.Format.Line.Visible = False
    ch.PlotArea.Format.Fill.Visible = False
    ch.ChartArea.Font.name = "KoPubWorld돋움체 Medium"
    ch.ChartArea.Font.Size = 7
    ch.ChartArea.Font.color = RGB(0, 0, 0)
    If kind <> "pie" Then
        ch.HasAxis(1, 1) = True: ch.HasAxis(2, 1) = True
    End If
    ch.HasLegend = (nser > 1 Or kind = "pie")
    If ch.HasLegend Then
        ch.Legend.Position = -4160            ' top
        ch.Legend.Font.name = "KoPubWorld돋움체 Medium": ch.Legend.Font.Size = 7
        ch.Legend.Font.color = RGB(0, 0, 0)
        ch.Legend.Format.Fill.Visible = False: ch.Legend.Format.Line.Visible = False
    End If
    If kind = "pie" Then
        Set ser = ch.SeriesCollection(1)
        For i = 1 To nr - 1
            ser.Points(i).Format.Fill.ForeColor.RGB = Palette(i)
            ser.Points(i).Format.Line.ForeColor.RGB = RGB(255, 255, 255)
            ser.Points(i).Format.Line.Weight = 1
        Next i
        ser.HasDataLabels = True
        ser.DataLabels.ShowPercentage = True: ser.DataLabels.ShowCategoryName = False: ser.DataLabels.ShowValue = False
        ser.DataLabels.Font.name = "KoPubWorld돋움체 Medium": ser.DataLabels.Font.Size = 7
        ser.DataLabels.Font.color = RGB(0, 0, 0)
        ser.DataLabels.Position = 2           ' outside end
    Else
        StyleAxis ch.Axes(1), 7
        StyleAxis ch.Axes(2), 7
        ch.Axes(2).TickLabels.NumberFormat = "#,##0.##"
        For i = 1 To nser
            Set ser = ch.SeriesCollection(i)
            If kind = "line" Or (kind = "combo" And i = nser) Then
                ser.ChartType = XL_LINE
                If kind = "combo" Then ser.AxisGroup = 2
                ser.Format.Line.Visible = True
                ser.Format.Line.ForeColor.RGB = Palette(i)
                ser.Format.Line.Weight = 1.75
                ser.MarkerStyle = -4142
                ser.Smooth = False
            Else
                ser.Format.Fill.Visible = True
                ser.Format.Fill.ForeColor.RGB = Palette(i)
                ser.Format.Line.Visible = False
            End If
        Next i
        If kind <> "line" Then ch.ChartGroups(1).GapWidth = 60
        If kind = "combo" Then
            ' 오른쪽 축: 마지막 계열이 %면 0% 서식
            pct = (InStr(grid(2, nc), "%") > 0)
            StyleAxis ch.Axes(2, 2), 7
            If pct Then ch.Axes(2, 2).TickLabels.NumberFormat = "0%"
            ch.Axes(2, 2).HasMajorGridlines = False
        End If
    End If
    ' 축 제목·눈금 겹침 방지
    ch.PlotArea.Format.Line.Visible = False
    On Error GoTo 0
    Application.ScreenUpdating = True
    r.Select
End Sub

Public Sub RFS_ChartLine(control As IRibbonControl)
    On Error GoTo eh
    MakeChart "line"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "라인 차트"
End Sub
Public Sub RFS_ChartBar(control As IRibbonControl)
    On Error GoTo eh
    MakeChart "bar"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "막대 차트"
End Sub
Public Sub RFS_ChartCombo(control As IRibbonControl)
    On Error GoTo eh
    MakeChart "combo"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "막대+선 차트"
End Sub
Public Sub RFS_ChartStacked(control As IRibbonControl)
    On Error GoTo eh
    MakeChart "stacked"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "누적 막대 차트"
End Sub
Public Sub RFS_ChartPie(control As IRibbonControl)
    On Error GoTo eh
    MakeChart "pie"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "파이 차트"
End Sub

'=============================================================== 엑셀 범위 → RFS 표 (자료 칸 안)
Public Sub RFS_TableFromExcel(control As IRibbonControl)
    On Error GoTo eh
    Dim grid() As String, nr As Long, nc As Long, i As Long, j As Long
    Dim cell As cell, r As Range, t As Table, w As Single, v As Variant, isNum As Boolean, hasHeaderCol As Boolean
    If Not ParseClip(grid, nr, nc) Then
        MsgBox "먼저 엑셀에서 표 범위를 복사(Ctrl+C)하세요. 첫 행이 머리글이 됩니다.", vbExclamation, "RFS": Exit Sub
    End If
    If Selection.Information(wdWithInTable) Then
        Set cell = Selection.Cells(1)
        w = cell.Width - 6
        Set r = cell.Range: r.End = r.End - 1: r.Text = ""
        Set r = cell.Range: r.End = r.End - 1
    Else
        Set r = FreshParagraph(): r.Collapse wdCollapseStart
        w = CentimetersToPoints(13.5)
    End If
    Application.ScreenUpdating = False
    Set t = ActiveDocument.Tables.Add(Range:=r, NumRows:=nr, NumColumns:=nc)
    With t
        .Style = ActiveDocument.Styles("RFS 표")
        .ApplyStyleHeadingRows = True
        .ApplyStyleFirstColumn = False
        .AllowAutoFit = False
        .PreferredWidthType = wdPreferredWidthPoints
        .PreferredWidth = w
        .rows.Alignment = wdAlignRowCenter
        .TopPadding = 1: .BottomPadding = 1: .LeftPadding = 3: .RightPadding = 3
    End With
    ' 열 폭: 첫 열은 넓게(항목명), 나머지 균등
    Dim w1 As Single: w1 = w * IIf(nc <= 3, 0.4, 0.3)
    t.Columns(1).Width = w1
    For j = 2 To nc: t.Columns(j).Width = (w - w1) / (nc - 1): Next j
    For i = 1 To nr
        For j = 1 To nc
            With t.cell(i, j)
                .Range.Text = grid(i, j)
                If i = 1 Then
                    .Range.Style = ActiveDocument.Styles("RFS 표머리")
                    .Range.Font.Size = 7
                Else
                    isNum = IsNumeric(Replace(Replace(Replace(Replace(grid(i, j), ",", ""), "%", ""), "(", "-"), ")", ""))
                    .Range.Style = ActiveDocument.Styles(IIf(j = 1, "RFS 표라벨", IIf(isNum, "RFS 표숫자", "RFS 표텍스트")))
                    .Range.Font.Size = 7
                End If
                .Range.ParagraphFormat.SpaceBefore = 1: .Range.ParagraphFormat.SpaceAfter = 1
                .Range.ParagraphFormat.LineSpacingRule = wdLineSpaceSingle
            End With
        Next j
    Next i
    t.rows(1).HeadingFormat = True
    Application.ScreenUpdating = True
    t.cell(1, 1).Range.Select
    Exit Sub
eh: Application.ScreenUpdating = True: fail "엑셀 표"
End Sub

'=============================================================== 차트 주석 도구 (빨간 글 / 화살표 / 강조 상자)
Private Function AnchorRange() As Range
    Dim r As Range
    Set r = Selection.Range
    r.Collapse wdCollapseStart
    Set AnchorRange = r.Paragraphs(1).Range
End Function

Private Sub PlaceShape(shp As Shape)
    On Error Resume Next
    With shp
        .RelativeHorizontalPosition = 2      ' wdRelativeHorizontalPositionColumn
        .RelativeVerticalPosition = 2        ' wdRelativeVerticalPositionParagraph
        .Left = 10: .Top = 10
        .LayoutInCell = True
        .WrapFormat.Type = 3                 ' wdWrapNone (텍스트 앞)
        .LockAnchor = False
    End With
    shp.Select
End Sub




'=============================================================== 자동 차트 (데이터 모양으로 종류 결정)
Private Function LooksLikeTime(ByVal t As String) As Boolean
    Dim re As Object
    Set re = CreateObject("VBScript.RegExp"): re.IgnoreCase = True
    ' 2023, 2025E, '25, 1Q25, 3Q26E, 2024-01, Jan-24, 24.06, FY26, 2025년, 1분기
    re.pattern = "^(FY)?('?\d{2}|\d{4})\s*(E|F|P)?$|^[1-4]Q\s*'?\d{2,4}\s*(E|F)?$|^\d{4}[-./]\d{1,2}([-./]\d{1,2})?$|^[A-Za-z]{3}[-. ]?'?\d{2,4}$|^\d{2,4}[-.]\d{2}$|^\d{4}년|^\d{2}\.\d{2}$|^[1-4]분기"
    LooksLikeTime = re.Test(Trim$(t))
End Function

Private Function IsPctSeries(grid() As String, ByVal nr As Long, ByVal col As Long) As Boolean
    Dim i As Long, n As Long, p As Long, v As Variant, small As Long
    For i = 2 To nr
        If Trim$(grid(i, col)) <> "" Then
            n = n + 1
            If InStr(grid(i, col), "%") > 0 Then p = p + 1
            v = ToNum(grid(i, col))
            If IsNumeric(v) Then If Abs(v) <= 1 And InStr(grid(i, col), ".") > 0 Then small = small + 1
        End If
    Next i
    If n = 0 Then Exit Function
    IsPctSeries = (p >= n * 0.6) Or (small >= n * 0.8) Or (InStr(grid(1, col), "%") > 0) Or (InStr(grid(1, col), "률") > 0) Or (InStr(grid(1, col), "율") > 0) Or (InStr(grid(1, col), "YoY") > 0)
End Function

Private Function ChooseKind(grid() As String, ByVal nr As Long, ByVal nc As Long, ByRef why As String) As String
    Dim i As Long, j As Long, nser As Long, npts As Long, tcount As Long, isTime As Boolean
    Dim pctCols As Long, lvlCols As Long, shareLike As Boolean, rowSum As Double, sumOK As Long, v As Variant, longLabel As Boolean
    nser = nc - 1: npts = nr - 1
    For i = 2 To nr
        If LooksLikeTime(grid(i, 1)) Then tcount = tcount + 1
        If Len(grid(i, 1)) > 8 Then longLabel = True
    Next i
    isTime = (tcount >= npts * 0.7)
    For j = 2 To nc
        If IsPctSeries(grid, nr, j) Then pctCols = pctCols + 1 Else lvlCols = lvlCols + 1
    Next j
    ' 비중형: 한 계열의 합이 ~100(또는 ~1), 또는 헤더/첫 열에 '비중'
    If nser = 1 Then
        rowSum = 0
        For i = 2 To nr
            v = ToNum(grid(i, 2)): If IsNumeric(v) Then rowSum = rowSum + v
        Next i
        shareLike = (Abs(rowSum - 100) < 3) Or (Abs(rowSum - 1) < 0.03) Or InStr(grid(1, 2), "비중") > 0 Or InStr(grid(1, 1), "비중") > 0
    Else
        ' 여러 계열: 각 행(항목)별 합이 ~100 → 시계열 누적
        sumOK = 0
        For i = 2 To nr
            rowSum = 0
            For j = 2 To nc
                v = ToNum(grid(i, j)): If IsNumeric(v) Then rowSum = rowSum + v
            Next j
            If Abs(rowSum - 100) < 3 Or Abs(rowSum - 1) < 0.03 Then sumOK = sumOK + 1
        Next i
        shareLike = (sumOK >= npts * 0.8) Or InStr(grid(1, 1), "비중") > 0
    End If
    If shareLike And nser = 1 And npts <= 6 And Not isTime Then
        ChooseKind = "pie": why = "한 계열의 합이 100%(비중) + 항목 " & npts & "개 → 파이": Exit Function
    End If
    If shareLike And nser >= 2 Then
        ChooseKind = "stacked": why = "항목별 합이 100%(비중 구성) → 누적 막대": Exit Function
    End If
    If isTime And lvlCols >= 1 And pctCols >= 1 Then
        ChooseKind = "combo": why = "시계열 + 금액 계열 + % 계열 → 막대+선(2축)": Exit Function
    End If
    If isTime And nser = 1 Then
        If npts <= 20 Then ChooseKind = "bar": why = "시계열 " & npts & "기간, 계열 1개 → 막대" Else ChooseKind = "line": why = "시계열 " & npts & "기간(장기) → 라인"
        Exit Function
    End If
    If isTime And nser >= 2 Then
        If npts > 8 Or pctCols = nser Then ChooseKind = "line": why = "시계열, 계열 " & nser & "개 → 라인" Else ChooseKind = "bar": why = "시계열 " & npts & "기간, 계열 " & nser & "개 → 묶은 막대"
        Exit Function
    End If
    If nser = 1 Then
        ChooseKind = "bar": why = "항목 비교, 계열 1개 → 막대": Exit Function
    End If
    ChooseKind = "bar": why = "항목 비교, 계열 " & nser & "개 → 묶은 막대"
End Function

' 막대+선에서 % 계열이 마지막 열이 아니면 마지막으로 이동
Private Sub MovePctLast(grid() As String, ByVal nr As Long, ByVal nc As Long)
    Dim j As Long, i As Long, tmp As String, pcol As Long
    pcol = 0
    For j = 2 To nc
        If IsPctSeries(grid, nr, j) Then pcol = j
    Next j
    If pcol = 0 Or pcol = nc Then Exit Sub
    For i = 1 To nr
        tmp = grid(i, pcol)
        For j = pcol To nc - 1: grid(i, j) = grid(i, j + 1): Next j
        grid(i, nc) = tmp
    Next i
End Sub

Public Sub RFS_ChartAuto(control As IRibbonControl)
    On Error GoTo eh
    Dim grid() As String, nr As Long, nc As Long, kind As String, why As String
    If Not Selection.Information(wdWithInTable) Then
        MsgBox "자료 틀의 가운데 칸(차트 자리)에 커서를 두고 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    If Not ParseClip(grid, nr, nc) Then
        MsgBox "먼저 엑셀에서 데이터 범위를 복사(Ctrl+C)하세요. 첫 행 = 계열 이름, 첫 열 = 항목/날짜.", vbExclamation, "RFS": Exit Sub
    End If
    kind = ChooseKind(grid, nr, nc, why)
    If kind = "combo" Then MovePctLast grid, nr, nc
    MakeChartFromGrid kind, grid, nr, nc
    Application.StatusBar = "RFS 자동 차트: " & why
    Exit Sub
eh: Application.ScreenUpdating = True: fail "자동 차트"
End Sub

'=============================================================== AI 차트 (API 키 없이: 프롬프트 복사 → Claude → JSON 붙여넣기)
Private Function SetClip(ByVal txt As String) As Boolean
    On Error Resume Next
    Dim d As Object
    Set d = CreateObject("new:{1C3B4210-F441-11CE-B9EA-00AA006B1A69}")
    d.SetText txt: d.PutInClipboard
    SetClip = (Err.Number = 0)
End Function

' 커서가 있는 자료 틀의 캡션 + 앞뒤 본문 문단
Private Sub FrameContext(ByRef caption As String, ByRef before As String, ByRef after As String)
    On Error Resume Next
    Dim t As Table, r As Range
    caption = "": before = "": after = ""
    If Not Selection.Information(wdWithInTable) Then Exit Sub
    Set t = Selection.Tables(1)
    caption = Replace(Replace(t.rows(1).Range.Text, vbCr, " "), Chr(7), " ")
    Set r = t.Range: r.Collapse wdCollapseStart: r.MoveStart wdCharacter, -1200
    r.End = t.Range.Start - 1
    before = Right$(Replace(r.Text, vbCr, " "), 900)
    Set r = t.Range: r.Collapse wdCollapseEnd: r.MoveEnd wdCharacter, 600
    after = Left$(Replace(r.Text, vbCr, " "), 500)
End Sub

Public Sub RFS_AIPrompt(control As IRibbonControl)
    On Error GoTo eh
    Dim grid() As String, nr As Long, nc As Long, i As Long, j As Long, tsv As String, cap As String, bf As String, af As String, p As String
    If Not Selection.Information(wdWithInTable) Then
        MsgBox "자료 틀의 가운데 칸(차트 자리)에 커서를 두고 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    If Not ParseClip(grid, nr, nc) Then
        MsgBox "먼저 엑셀에서 데이터 범위를 복사(Ctrl+C)하세요.", vbExclamation, "RFS": Exit Sub
    End If
    For i = 1 To nr
        For j = 1 To nc: tsv = tsv & grid(i, j) & IIf(j < nc, vbTab, ""): Next j
        tsv = tsv & vbLf
    Next i
    ActiveDocument.Variables("RFS_AI_DATA").value = tsv
    FrameContext cap, bf, af
    p = "너는 증권사 리서치 리포트의 차트 디자이너다. 아래 데이터와 맥락을 보고, 리포트에 넣을 차트 사양을 JSON 하나로만 답해라. 설명은 JSON 안의 reason 필드에만 쓴다." & vbLf & vbLf
    p = p & "[사용 가능한 차트 종류] line(라인), bar(세로 막대), combo(막대+선 2축: 마지막 계열이 선·오른쪽 축), stacked(누적 막대), pie(파이)" & vbLf
    p = p & "[디자인 규칙] 서식은 이미 고정되어 있으니 종류·강조·주석만 정한다. 강조는 한 지점(항목)만. 주석은 15자 이내 짧은 문장, 최대 2개, 본문 논지와 직결되는 것만. 없으면 빈 배열." & vbLf & vbLf
    p = p & "[이 학회가 과거 리포트에서 실제로 고른 예시] (같은 취향을 따라라)" & vbLf
    p = p & "- bar: 캡션 '[자료 3-3] 연속쓰기?읽기 성능 비교 (단위: GB/s)' / 계열 [파두 Gen5(FC5161), 파두 Gen6(FC6161), 마이크론 Gen6] / 항목 [연속읽기, 연속쓰기...] (2개)" & vbLf
    p = p & "- bar: 캡션 '[자료 2-4] 경쟁사 대비 OPM 비교 (단위: %)' / 계열 [] / 항목 [HD현대마린솔루션, HD현대중공업 , HD현대마린엔진, 삼성중공업...] (5개)" & vbLf
    p = p & "- bar: 캡션 '[자료 3-9] 플래닛 랩스(상)와 쎄트렉아이(하)의 수주 잔고와 매출 (단위: Mn $, 십억 원)' / 계열 [매출, 수주잔고] / 항목 [2021, 2022, 2023, 2024...] (4개)" & vbLf
    p = p & "- bar: 캡션 '[자료 2-3] 매출액 대비 인건비 및 CAPEX 비중 (단위: %)' / 계열 [HD현대마린솔루션, HD현대중공업, HD현대마린엔진] / 항목 [인건비, CAPEX...] (2개)" & vbLf
    p = p & "- bar: 캡션 '[자료 3-6] 나사의 지구 관측 분석 예산 (단위: 100Mn $)' / 계열 [] / 항목 [2021, 2022, 2023, 2024...] (4개)" & vbLf
    p = p & "- combo: 캡션 '[자료 3-15] 국내 스타크 침투율 (단위: %)' / 계열 [누적 스타크 수, 국내 총 수술 로봇 수, 침투율] / 항목 [2025, 2026E, 2027E, 2028E...] (4개)" & vbLf
    p = p & "- combo: 캡션 '[자료 2-5] 연간 매출액 및 영업이익 추이 (단위: 백억 원)' / 계열 [매출액, 영업이익, 2019] / 항목 [2019, 2020, 2021, 2022...] (8개)" & vbLf
    p = p & "- combo: 캡션 '[자료 4-7] 글로벌 DRAM 수급 전망 (단위: million 2Gb, %)' / 계열 [Total DRAM supply(좌), Total DRAM demand(좌), Sufficiency(우)] / 항목 [1Q25, 2Q25, 3Q25, 4Q25E...] (8개)" & vbLf
    p = p & "- combo: 캡션 '[자료 3-6] NAND 산업규모와 성장률 (단위: 십억 USD, %)' / 계열 [NAND 산업규모, 성장율] / 항목 [2001, 2002, 2003, 2004...] (26개)" & vbLf
    p = p & "- combo: 캡션 '[자료 3-1] 연도별 셀트리온向 매출 및 앱토즈마 점유율 추이 (단위: 십억 원)' / 계열 [셀트리온向 매출, 시장 내 앱토즈마 점유율] / 항목 [2024, 2025, 2026, 2027...] (5개)" & vbLf
    p = p & "- line: 캡션 '[자료 3-3] 주요 국가 LNG 수출량 (단위: MT)' / 계열 [미국, 카타르, 호주, 러시아] / 항목 [43221, 43252, 43282, 43313...] (88개)" & vbLf
    p = p & "- line: 캡션 '[자료 3-3] 호르무즈 해협 통과 선박 (단위: 척)' / 계열 [] / 항목 [45292, 45293, 45294, 45295...] (860개)" & vbLf
    p = p & "- line: 캡션 '[자료 1-8] LPDDR 가격 추이 (단위: USD)' / 계열 [LPDDR5 32Gb, LPDDR4 32Gb, LPDDR4 16Gb] / 항목 [43997, 43998, 43999, 44000...] (605개)" & vbLf
    p = p & "- line: 캡션 '[자료 3-16] 분기별 Q 추정 (단위: kg)' / 계열 [] / 항목 [ 1Q18 ,  2Q18 ,  3Q18 ,  4Q18 ...] (48개)" & vbLf
    p = p & "- line: 캡션 '[자료 1-1] KOSPI와 KRX 헬스케어 주가 추이 (단위: Point)' / 계열 [Kospi, KRX 헬스케어] / 항목 [45985, 45982, 45981, 45980...] (218개)" & vbLf
    p = p & "- pie: 캡션 '[자료 1-9] 2025년 글로벌 LPDDR DRAM 세대별 시장 점유율' / 계열 [시장 점유율] / 항목 [LPDDR5/5X, LPDDR4/4X, LPDDR3, LPDDR2...] (4개)" & vbLf
    p = p & "- pie: 캡션 '[자료 4-5] 글로벌 메모리 테스트 핸들러 M/S (단위: %)' / 계열 [테크윙] / 항목 [테크윙, 그외...] (2개)" & vbLf
    p = p & "- pie: 캡션 '[자료 2-1] CORE 사업 부문별 매출 비중 (단위: %)' / 계열 [2Q25] / 항목 [AM 솔루션, 친환경 솔루션, 디지털 솔루션...] (3개)" & vbLf
    p = p & "- pie: 캡션 '[자료 2-1] 1Q26 제품별 매출 비중 (단위: %)' / 계열 [SSD 컨트롤러] / 항목 [SSD 컨트롤러, SSD 완제품, 기타...] (3개)" & vbLf
    p = p & "- pie: 캡션 '[자료 3-5] 4행정 D/F 엔진 점유율 (단위: %)' / 계열 [] / 항목 [HD현대, Wartsila, MAN, 기타...] (4개)" & vbLf
    p = p & "- stacked: 캡션 '[자료 2-4] 주요 발사체 중 팰컨9의 비중이 2024년 83%를 기록하며 지속 성장 (단위: %)' / 계열 [팰컨9, 소유즈, 아리안5, 아틀라스V] / 항목 ['10, '11, '12, '13...] (15개)" & vbLf
    p = p & "- stacked: 캡션 '[자료 3-1] 현대그룹 조선 3사 인도 예정 선박 (단위: 척)' / 계열 [HD현대중공업, HD현대미포, HD현대삼호] / 항목 [2025, 2026E, 2027E, 2028E...] (4개)" & vbLf
    p = p & "- stacked: 캡션 '[자료 1-6] SSD PCIe 세대별 비중 추이 및 전망 (단위: %)' / 계열 [Pcle 3.0, Pcle 4.0, Pcle 5.0, Pcle 6.0] / 항목 [2024A, 2025A, 2026E, 2027E...] (5개)" & vbLf
    p = p & "- stacked: 캡션 '[자료 2-2] 응용처별 매출 비중 (단위: %)' / 계열 [IoT, Consumer, Mobile, Automotive, Network] / 항목 [2020, 2021, 2022, 2023...] (6개)" & vbLf
    p = p & "- stacked: 캡션 '[자료 2-4] 제품별 매출 추이 (단위: 십억 원)' / 계열 [NAND MCP, eMCP, NOR MCP, NAND, DRAM] / 항목 [1Q23, 2Q23, 3Q23, 4Q23...] (13개)" & vbLf
    p = p & vbLf & "[자료 캡션] " & Trim$(cap) & vbLf
    p = p & "[앞 문단] " & Trim$(bf) & vbLf
    p = p & "[뒤 문단] " & Trim$(af) & vbLf & vbLf
    p = p & "[데이터] (첫 행=계열 이름, 첫 열=항목, 탭 구분)" & vbLf & tsv & vbLf
    p = p & "[응답 형식] 아래 JSON만 출력:" & vbLf
    p = p & "{""type"":""bar|line|combo|stacked|pie"", ""highlight"":""강조할 항목명 또는 빈 문자열"", ""label_last"":true|false, ""annotations"":[""주석1"",""주석2""], ""reason"":""한 문장""}"
    If Not SetClip(p) Then Err.Raise vbObjectError + 20, , "클립보드에 복사하지 못했습니다."
    MsgBox "프롬프트를 복사했습니다." & vbCrLf & vbCrLf & "1) claude.ai 채팅창에 붙여넣기(Ctrl+V)" & vbCrLf & "2) 답변의 { ... } JSON을 복사(Ctrl+C)" & vbCrLf & "3) 같은 칸에 커서 두고 [AI 적용]", vbInformation, "RFS AI 차트"
    Exit Sub
eh: fail "AI 프롬프트"
End Sub

Private Function JsonStr(ByVal js As String, ByVal key As String) As String
    Dim re As Object, m As Object
    Set re = CreateObject("VBScript.RegExp"): re.Global = False
    re.pattern = """" & key & """\s*:\s*""((?:[^""\\]|\\.)*)"""
    Set m = re.Execute(js)
    If m.Count > 0 Then JsonStr = Replace(m(0).SubMatches(0), "\""", """")
End Function

Public Sub RFS_AIApply(control As IRibbonControl)
    On Error GoTo eh
    Dim js As String, grid() As String, nr As Long, nc As Long, tsv As String, lines() As String, f() As String, i As Long, j As Long
    Dim kind As String, hl As String, lastLbl As Boolean, ann As String, re As Object, m As Object, k As Long
    js = ClipText()
    If InStr(js, "{") = 0 Then MsgBox "클립보드에 JSON이 없습니다. Claude 답변의 { ... } 부분을 복사한 뒤 누르세요.", vbExclamation, "RFS": Exit Sub
    js = Mid$(js, InStr(js, "{"))
    js = Left$(js, InStrRev(js, "}"))
    If Not Selection.Information(wdWithInTable) Then
        MsgBox "자료 틀의 가운데 칸(차트 자리)에 커서를 두고 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    tsv = ActiveDocument.Variables("RFS_AI_DATA").value
    If Len(tsv) < 3 Then MsgBox "[AI 프롬프트]를 먼저 실행해 데이터를 저장하세요.", vbExclamation, "RFS": Exit Sub
    ' TSV → grid
    Do While Right$(tsv, 1) = vbLf: tsv = Left$(tsv, Len(tsv) - 1): Loop
    lines = Split(tsv, vbLf): nr = UBound(lines) + 1: nc = UBound(Split(lines(0), vbTab)) + 1
    ReDim grid(1 To nr, 1 To nc)
    For i = 0 To nr - 1
        f = Split(lines(i), vbTab)
        For j = 0 To nc - 1: If j <= UBound(f) Then grid(i + 1, j + 1) = f(j)
        Next j
    Next i
    kind = LCase$(JsonStr(js, "type"))
    If kind = "" Then kind = ChooseKind(grid, nr, nc, ann)
    hl = JsonStr(js, "highlight")
    lastLbl = (InStr(js, """label_last"":true") > 0 Or InStr(js, """label_last"": true") > 0)
    If kind = "combo" Then MovePctLast grid, nr, nc
    MakeChartFromGrid kind, grid, nr, nc
    ' 강조/레이블
    ApplyEmphasis grid, nr, nc, kind, hl, lastLbl
    ' 주석 (빨간 글) - 위치는 사용자가 끌어서 조정
    Set re = CreateObject("VBScript.RegExp"): re.Global = True
    re.pattern = """annotations""\s*:\s*\[([^\]]*)\]"
    Set m = re.Execute(js)
    If m.Count > 0 Then
        ann = m(0).SubMatches(0)
        re.pattern = """((?:[^""\\]|\\.)*)"""
        Set m = re.Execute(ann)
        For k = 0 To m.Count - 1
            If k >= 2 Then Exit For
            AddAnnotation Replace(m(k).SubMatches(0), "\""", """"), 10 + k * 14
        Next k
    End If
    Application.StatusBar = "RFS AI 차트: " & JsonStr(js, "reason")
    Exit Sub
eh: Application.ScreenUpdating = True: fail "AI 적용"
End Sub

Private Sub AddAnnotation(ByVal txt As String, ByVal topPos As Single)
    On Error Resume Next
    Dim shp As Shape
    Set shp = ActiveDocument.Shapes.AddTextbox(1, 0, 0, 100, 16, AnchorRange())
    With shp
        .Fill.Visible = False: .Line.Visible = False
        .TextFrame.MarginLeft = 0: .TextFrame.MarginRight = 0: .TextFrame.MarginTop = 0: .TextFrame.MarginBottom = 0
        .TextFrame.AutoSize = True: .TextFrame.WordWrap = True
        With .TextFrame.TextRange
            .Text = txt
            .Font.name = "KoPubWorld돋움체 Bold": .Font.NameFarEast = "KoPubWorld돋움체 Bold"
            .Font.Size = 7: .Font.color = HexRGB("C00000")
            .ParagraphFormat.SpaceAfter = 0
        End With
    End With
    PlaceShape shp
    shp.Top = topPos
End Sub

' 강조 지점 색(3번색) / 마지막 값 레이블
Private Sub ApplyEmphasis(grid() As String, ByVal nr As Long, ByVal nc As Long, ByVal kind As String, ByVal hl As String, ByVal lastLbl As Boolean)
    On Error Resume Next
    Dim ish As InlineShape, ch As Object, ser As Object, i As Long, idx As Long, pt As Object
    Set ish = Selection.Cells(1).Range.InlineShapes(1)
    Set ch = ish.Chart
    If kind = "pie" Then Exit Sub
    Set ser = ch.SeriesCollection(1)
    If hl <> "" Then
        For i = 2 To nr
            If Trim$(grid(i, 1)) = Trim$(hl) Then idx = i - 1
        Next i
        If idx > 0 Then
            Set pt = ser.Points(idx)
            If kind = "line" Then
                pt.MarkerStyle = 8: pt.MarkerSize = 5
                pt.MarkerBackgroundColor = HexRGB("C00000"): pt.MarkerForegroundColor = HexRGB("C00000")
            Else
                pt.Format.Fill.ForeColor.RGB = HexRGB("2F5597")
            End If
            pt.HasDataLabel = True
            pt.DataLabel.Font.name = "KoPubWorld돋움체 Bold": pt.DataLabel.Font.Size = 7
            pt.DataLabel.Font.color = HexRGB("C00000")
            pt.DataLabel.NumberFormat = "#,##0.##"
        End If
    End If
    If lastLbl Then
        Set pt = ser.Points(nr - 1)
        pt.HasDataLabel = True
        pt.DataLabel.Font.name = "KoPubWorld돋움체 Medium": pt.DataLabel.Font.Size = 7
        pt.DataLabel.NumberFormat = "#,##0.##"
    End If
End Sub

'=============================================================== 주가 비교 차트 (=100)
Public Sub RFS_CompareChart(control As IRibbonControl)
    On Error GoTo eh
    Dim tks As String, arr() As String, k As Long, base() As PxRow, nb As Long, tmp() As PxRow, m As Long
    Dim d1 As Date, d2 As Date, sd As String, grid() As String, i As Long, code As String, isKR As Boolean, first As Double
    Dim names() As String, nt As Long, vals() As Double
    If Not Selection.Information(wdWithInTable) Then
        MsgBox "자료 틀의 가운데 칸(차트 자리)에 커서를 두고 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    tks = InputBox("비교할 티커를 쉼표로 (첫 번째가 기준). 예: 089030.KQ, 000660.KS, 005930.KS, MU", "RFS 주가 비교", CoverValue("ticker"))
    If tks = "" Then Exit Sub
    sd = InputBox("시작일. 예: 2024-12-01", "RFS 주가 비교", Format(DateAdd("yyyy", -1, Date), "yyyy-mm-dd"))
    If sd = "" Or Not IsDate(sd) Then Exit Sub
    Dim mode As String, krFlag() As Boolean
    mode = InputBox("1 = 시작일 100으로 정규화 (축 하나, 여러 종목 비교)" & vbCrLf & "2 = 실제 주가 (원화 왼쪽 축, 달러 오른쪽 축)", "RFS 주가 비교", "1")
    If mode <> "1" And mode <> "2" Then Exit Sub
    d1 = CDate(sd): d2 = Date
    arr = Split(tks, ","): nt = UBound(arr) + 1
    If mode = "2" Then KRFirst arr          ' 범례 좌우 = 축 좌우 (원화 왼쪽 먼저, 달러 오른쪽 나중)
    ReDim names(1 To nt): ReDim krFlag(1 To nt)
    Application.ScreenUpdating = False
    For k = 1 To nt
        code = Trim$(arr(k - 1))
        names(k) = code
        If InStr(code, ".") > 0 Then code = Left$(code, InStr(code, ".") - 1)
        isKR = (Len(code) = 6 And IsNumeric(code))
        krFlag(k) = isKR
        names(k) = LookupName(code, isKR, IIf(isKR, code, Trim$(arr(k - 1))))
        m = 0
        Dim lastErr As String: lastErr = ""
        On Error Resume Next
        If isKR Then
            m = FetchNaver(code, d1, d2, tmp)
            If Err.Number <> 0 Then lastErr = "Naver: " & Err.Description: Err.Clear
        Else
            m = FetchUS(code, d1, d2, tmp, lastErr)
        End If
        On Error GoTo eh
        If m < 5 Then Err.Raise vbObjectError + 30, , "'" & Trim$(arr(k - 1)) & "' 주가를 받지 못했습니다. " & lastErr
        SortRows tmp, m
        If k = 1 Then
            base = tmp: nb = m
            ReDim vals(1 To nb, 1 To nt)
        End If
        first = tmp(1).c
        For i = 1 To nb
            If mode = "1" Then
                If first > 0 Then vals(i, k) = CloseOnOrBefore(tmp, m, base(i).d) / first * 100
            Else
                vals(i, k) = CloseOnOrBefore(tmp, m, base(i).d)
            End If
        Next i
    Next k
    If mode = "2" Then
        If PriceGapTooBig(vals, nb, nt, krFlag) Then
            If MsgBox("같은 축에 가격대가 10배 이상 차이 나는 종목이 있어 작은 종목이 바닥에 깔립니다." & vbCrLf & _
                      "시작일=100 정규화(1번)로 바꿀까요?", vbYesNo + vbQuestion, "RFS 주가 비교") = vbYes Then
                For k = 1 To nt
                    first = vals(1, k)
                    For i = 1 To nb
                        If first > 0 Then vals(i, k) = vals(i, k) / first * 100
                    Next i
                Next k
                mode = "1"
            End If
        End If
    End If
    ReDim grid(1 To nb + 1, 1 To nt + 1)
    grid(1, 1) = "날짜"
    For k = 1 To nt: grid(1, k + 1) = names(k): Next k
    For i = 1 To nb
        grid(i + 1, 1) = Format(base(i).d, "yyyy-mm-dd")
        For k = 1 To nt: grid(i + 1, k + 1) = Format(vals(i, k), IIf(mode = "1" Or Not krFlag(k), "0.00", "0")): Next k
    Next i
    MakeChartFromGrid "line", grid, nb + 1, nt + 1
    DateAxis 3
    CompareLineStyle nt
    If mode = "2" Then DualCurrencyAxes krFlag, nt
    CompareAxisScale vals, nb, nt, krFlag, mode
    Application.ScreenUpdating = True
    Application.StatusBar = "RFS 주가 비교: " & nt & "종목, " & IIf(mode = "1", Format(base(1).d, "yyyy.mm.dd") & "=100", "실제 주가(원/달러 2축)")
    Exit Sub
eh: Application.ScreenUpdating = True: fail "주가 비교"
End Sub

' 방금 만든 차트의 가로축을 날짜축(월 간격)으로
Private Sub DateAxis(ByVal monthsStep As Long)
    On Error Resume Next
    Dim ch As Object
    Set ch = Selection.Cells(1).Range.InlineShapes(1).Chart
    ch.Axes(1).CategoryType = 2               ' xlTimeScale
    ch.Axes(1).BaseUnit = 0                   ' days
    ch.Axes(1).MajorUnitScale = 3: ch.Axes(1).MajorUnit = monthsStep
    ch.Axes(1).TickLabels.NumberFormat = "[$-409]mmm-yy;@"
    ch.Axes(2).TickLabels.NumberFormat = "#,##0"
End Sub

'=============================================================== 모델 값 꽂기 (이름 있는 셀 → 본문 연결 컨트롤)

Private Function ValuesPart() As CustomXMLPart
    Dim p As CustomXMLPart
    On Error Resume Next
    Set p = ActiveDocument.CustomXMLParts.SelectByNamespace(VAL_NS)(1)
    On Error GoTo 0
    If p Is Nothing Then Set p = ActiveDocument.CustomXMLParts.Add("<rfs:values xmlns:rfs=""" & VAL_NS & """/>")
    p.NamespaceManager.AddNamespace "rfs", VAL_NS
    Set ValuesPart = p
End Function

Private Function SafeName(ByVal s As String) As String
    Dim i As Long, ch As String, o As String
    If InStr(s, "!") > 0 Then s = Mid$(s, InStrRev(s, "!") + 1)
    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        If ch Like "[A-Za-z0-9_]" Or AscW(ch) > 255 Then o = o & ch Else o = o & "_"
    Next i
    If o = "" Then o = "x"
    If Left$(o, 1) Like "[0-9]" Then o = "n_" & o
    SafeName = o
End Function

Private Sub SetValueNode(ByVal key As String, ByVal value As String)
    Dim p As CustomXMLPart, nd As CustomXMLNode, root As CustomXMLNode
    Set p = ValuesPart()
    Set nd = p.SelectSingleNode("/rfs:values/rfs:" & key)
    If nd Is Nothing Then
        Set root = p.SelectSingleNode("/rfs:values")
        p.AddNode root, key, VAL_NS, , 1, value
    Else
        nd.Text = value
    End If
End Sub

' 엑셀 채우기 때 호출: 단일 셀 이름 전부 저장
Private Function StoreAllNames(wb As Object) As Long
    Dim nm As Object, rng As Object, n As Long, key As String
    For Each nm In wb.names
        On Error Resume Next
        Set rng = Nothing
        Set rng = nm.RefersToRange
        If Not rng Is Nothing Then
            If rng.Cells.Count = 1 And Left$(nm.name, 1) <> "_" Then
                key = SafeName(nm.name)
                SetValueNode key, rng.Text
                n = n + 1
            End If
        End If
        On Error GoTo 0
    Next nm
    StoreAllNames = n
End Function

Public Sub RFS_InsertValue(control As IRibbonControl)
    On Error GoTo eh
    Dim p As CustomXMLPart, root As CustomXMLNode, nd As CustomXMLNode, q As String, hits() As String, nh As Long, i As Long, pick As String, cc As ContentControl
    Set p = ValuesPart()
    Set root = p.SelectSingleNode("/rfs:values")
    If root.ChildNodes.Count = 0 Then
        MsgBox "저장된 모델 값이 없습니다. 먼저 [마무리 > 엑셀 채우기]를 실행하세요 (모델의 이름 있는 셀이 모두 저장됩니다).", vbExclamation, "RFS": Exit Sub
    End If
    q = InputBox("꽂을 값의 이름 (일부만 쳐도 됨. 비우면 전체 목록)" & vbCrLf & "예: rev_2026E, opm, target", "RFS 모델 값 꽂기")
    ReDim hits(1 To root.ChildNodes.Count)
    For Each nd In root.ChildNodes
        If q = "" Or InStr(1, nd.BaseName, q, vbTextCompare) > 0 Then
            nh = nh + 1: hits(nh) = nd.BaseName
        End If
    Next nd
    If nh = 0 Then MsgBox "'" & q & "'에 해당하는 이름이 없습니다.", vbExclamation, "RFS": Exit Sub
    If nh = 1 Then
        pick = hits(1)
    Else
        Dim lst As String
        For i = 1 To nh
            If i > 40 Then lst = lst & "... 외 " & (nh - 40) & "개 (검색어를 더 구체적으로)": Exit For
            lst = lst & i & ") " & hits(i) & " = " & p.SelectSingleNode("/rfs:values/rfs:" & hits(i)).Text & vbCrLf
        Next i
        pick = InputBox(lst & vbCrLf & "번호 입력:", "RFS 모델 값 꽂기 (" & nh & "개)")
        If pick = "" Or Not IsNumeric(pick) Then Exit Sub
        If CLng(pick) < 1 Or CLng(pick) > nh Then Exit Sub
        pick = hits(CLng(pick))
    End If
    Set cc = ActiveDocument.ContentControls.Add(wdContentControlText, Selection.Range)
    cc.Tag = "val:" & pick
    cc.Title = pick
    cc.XMLMapping.SetMapping "/rfs:values[1]/rfs:" & pick & "[1]", "xmlns:rfs='" & VAL_NS & "'"
    cc.Range.Select
    Selection.Collapse wdCollapseEnd
    Exit Sub
eh: fail "모델 값 꽂기"
End Sub

' --- Yahoo Finance (미국 종목/지수): symbol 예 MU, TTWO, ^IXIC, ^GSPC
Private Function FetchYahoo(ByVal symbol As String, ByVal d1 As Date, ByVal d2 As Date, rows() As PxRow) As Long
    Dim body As String, re As Object, m As Object, ts() As String, cl() As String, i As Long, n As Long, p1 As Long, p2 As Long
    p1 = DateDiff("s", DateSerial(1970, 1, 1), d1): p2 = DateDiff("s", DateSerial(1970, 1, 1), d2 + 1)
    body = HttpGet("https://query1.finance.yahoo.com/v8/finance/chart/" & symbol & "?period1=" & p1 & "&period2=" & p2 & "&interval=1d&events=history")
    Set re = CreateObject("VBScript.RegExp"): re.Global = False
    re.pattern = """timestamp"":\[([^\]]*)\]"
    Set m = re.Execute(body)
    If m.Count = 0 Then Err.Raise vbObjectError + 12, , "Yahoo 응답에 timestamp 없음"
    ts = Split(m(0).SubMatches(0), ",")
    re.pattern = """close"":\[([^\]]*)\]"
    Set m = re.Execute(body)
    If m.Count = 0 Then Err.Raise vbObjectError + 12, , "Yahoo 응답에 close 없음"
    cl = Split(m(0).SubMatches(0), ",")
    ReDim rows(1 To UBound(ts) + 1)
    For i = 0 To UBound(ts)
        If i <= UBound(cl) Then
            If IsNumeric(cl(i)) And Trim$(cl(i)) <> "null" Then
                n = n + 1
                With rows(n)
                    .d = DateAdd("s", CDbl(ts(i)), DateSerial(1970, 1, 1))
                    .d = DateSerial(Year(.d), Month(.d), Day(.d))
                    .c = CDbl(cl(i)): .o = .c: .h = .c: .l = .c
                End With
            End If
        End If
    Next i
    ' 고가/저가는 별도 배열
    re.pattern = """high"":\[([^\]]*)\]": Set m = re.Execute(body)
    If m.Count > 0 Then
        Dim hi() As String: hi = Split(m(0).SubMatches(0), ",")
        re.pattern = """low"":\[([^\]]*)\]": Set m = re.Execute(body)
        Dim lo() As String: lo = Split(m(0).SubMatches(0), ",")
        n = 0
        For i = 0 To UBound(ts)
            If i <= UBound(cl) Then
                If IsNumeric(cl(i)) And Trim$(cl(i)) <> "null" Then
                    n = n + 1
                    If i <= UBound(hi) Then If IsNumeric(hi(i)) Then rows(n).h = CDbl(hi(i))
                    If i <= UBound(lo) Then If IsNumeric(lo(i)) Then rows(n).l = CDbl(lo(i))
                End If
            End If
        Next i
    End If
    FetchYahoo = n
End Function

' 미국: Yahoo → Stooq 순으로 시도, 실패 사유를 lastErr에
Private Function FetchUS(ByVal code As String, ByVal d1 As Date, ByVal d2 As Date, rows() As PxRow, ByRef lastErr As String) As Long
    Dim n As Long
    On Error Resume Next
    n = FetchYahoo(code, d1, d2, rows)
    If Err.Number <> 0 Then lastErr = "Yahoo: " & Err.Description: Err.Clear: n = 0
    If n < 5 Then
        n = FetchStooq(LCase$(code) & ".us", d1, d2, rows)
        If Err.Number <> 0 Then lastErr = lastErr & " / Stooq: " & Err.Description: Err.Clear: n = 0
    End If
    On Error GoTo 0
    FetchUS = n
End Function

' 종목 이름 조회 (국내: 네이버 페이지 제목, 미국: Yahoo shortName). 실패하면 티커 그대로
Private Function LookupName(ByVal code As String, ByVal isKR As Boolean, ByVal fallback As String) As String
    On Error Resume Next
    Dim html As String, re As Object, m As Object, nm As String
    Set re = CreateObject("VBScript.RegExp"): re.Global = False
    If isKR Then
        html = HttpGet("https://m.stock.naver.com/api/stock/" & code & "/basic")
        re.pattern = """stockName""\s*:\s*""([^""]+)"""
        Set m = re.Execute(html)
        If m.Count > 0 Then nm = Trim$(m(0).SubMatches(0))
        If nm = "" Then
            html = HttpGet("https://finance.naver.com/item/main.naver?code=" & code, "euc-kr")
            re.pattern = "<title>\s*([^:<|]+?)\s*[:|]"
            Set m = re.Execute(html)
            If m.Count > 0 Then nm = Trim$(m(0).SubMatches(0))
        End If
    Else
        html = HttpGet("https://query1.finance.yahoo.com/v8/finance/chart/" & code & "?range=5d&interval=1d")
        re.pattern = """shortName"":""([^""]+)"""
        Set m = re.Execute(html)
        If m.Count > 0 Then nm = Trim$(m(0).SubMatches(0))
        nm = Replace(Replace(Replace(nm, ", Inc.", ""), " Inc.", ""), " Corporation", "")
    End If
    If nm = "" Or Len(nm) > 30 Then LookupName = fallback Else LookupName = nm & "(" & fallback & ")"
End Function

' 국내 티커를 앞으로, 미국 티커를 뒤로 (각 그룹 안 순서는 유지)
Private Sub KRFirst(arr() As String)
    Dim a() As String, n As Long, k As Long, c As String, p As Long, idx As Long
    n = UBound(arr): ReDim a(0 To n)
    For p = 0 To 1
        For k = 0 To n
            c = Trim$(arr(k))
            If InStr(c, ".") > 0 Then c = Left$(c, InStr(c, ".") - 1)
            If ((Len(c) = 6 And IsNumeric(c)) And p = 0) Or (Not (Len(c) = 6 And IsNumeric(c)) And p = 1) Then
                a(idx) = arr(k): idx = idx + 1
            End If
        Next k
    Next p
    arr = a
End Sub

' 같은 축(원/달러)끼리 평균 가격이 10배 넘게 차이 나면 True
Private Function PriceGapTooBig(vals() As Double, ByVal nb As Long, ByVal nt As Long, krFlag() As Boolean) As Boolean
    Dim g As Long, k As Long, i As Long, a As Double, mx As Double, mn As Double
    For g = 0 To 1
        mx = 0: mn = 0
        For k = 1 To nt
            If (krFlag(k) And g = 0) Or (Not krFlag(k) And g = 1) Then
                a = 0
                For i = 1 To nb: a = a + vals(i, k): Next i
                a = a / nb
                If a > mx Then mx = a
                If mn = 0 Or (a > 0 And a < mn) Then mn = a
            End If
        Next k
        If mn > 0 And mx / mn > 10 Then PriceGapTooBig = True: Exit Function
    Next g
End Function

' 주가 비교 선: RFS 양식 색 1~6번 순서, 1.75pt 실선
Private Sub CompareLineStyle(ByVal nt As Long)
    On Error Resume Next
    Dim ch As Object, k As Long
    Set ch = Selection.Cells(1).Range.InlineShapes(1).Chart
    For k = 1 To nt
        With ch.SeriesCollection(k).Format.Line
            .Visible = True
            .ForeColor.RGB = Palette(k)
            .Weight = 1.75
            .DashStyle = 1
        End With
    Next k
End Sub

' 세로축 눈금 4~5개: 0부터, 1/2/2.5/5 x 10^n 간격 중 눈금 수 4개 이하가 되는 가장 촘촘한 간격
Private Sub NiceValueAxis(ax As Object, ByVal maxv As Double)
    On Error Resume Next
    Dim e As Long, t As Variant, st As Double, cnt As Long
    If maxv <= 0 Then Exit Sub
    For e = -2 To 12
        For Each t In Array(1, 2, 2.5, 5)
            st = t * 10 ^ e
            cnt = -Int(-maxv / st)
            If cnt <= 4 Then
                ax.MinimumScale = 0
                ax.MaximumScale = cnt * st
                ax.MajorUnit = st
                Exit Sub
            End If
        Next t
    Next e
End Sub

' 비교 차트 세로축(들) 눈금 정리
Private Sub CompareAxisScale(vals() As Double, ByVal nb As Long, ByVal nt As Long, krFlag() As Boolean, ByVal mode As String)
    On Error Resume Next
    Dim ch As Object, k As Long, i As Long, mxL As Double, mxR As Double, hasKR As Boolean, hasUS As Boolean
    Set ch = Selection.Cells(1).Range.InlineShapes(1).Chart
    For k = 1 To nt
        If krFlag(k) Then hasKR = True Else hasUS = True
        For i = 1 To nb
            If mode = "2" And hasKR And Not krFlag(k) Then
                If vals(i, k) > mxR Then mxR = vals(i, k)
            Else
                If vals(i, k) > mxL Then mxL = vals(i, k)
            End If
        Next i
    Next k
    If mode = "2" And hasKR And hasUS Then
        mxL = 0: mxR = 0
        For k = 1 To nt
            For i = 1 To nb
                If krFlag(k) Then
                    If vals(i, k) > mxL Then mxL = vals(i, k)
                Else
                    If vals(i, k) > mxR Then mxR = vals(i, k)
                End If
            Next i
        Next k
        NiceValueAxis ch.Axes(2, 1), mxL
        NiceValueAxis ch.Axes(2, 2), mxR
    Else
        NiceValueAxis ch.Axes(2), mxL
    End If
End Sub

' 실제 주가 모드: 원화 계열 왼쪽 축, 달러 계열 오른쪽 축
Private Sub DualCurrencyAxes(krFlag() As Boolean, ByVal nt As Long)
    On Error Resume Next
    Dim ch As Object, k As Long, hasKR As Boolean, hasUS As Boolean
    Set ch = Selection.Cells(1).Range.InlineShapes(1).Chart
    For k = 1 To nt
        If krFlag(k) Then hasKR = True Else hasUS = True
    Next k
    If hasKR And hasUS Then
        For k = 1 To nt
            If Not krFlag(k) Then ch.SeriesCollection(k).AxisGroup = 2
        Next k
        StyleAxis ch.Axes(2, 1), 7
        StyleAxis ch.Axes(2, 2), 7
        ch.Axes(2, 1).TickLabels.NumberFormat = "#,##0"            ' 원
        ch.Axes(2, 2).TickLabels.NumberFormat = "[$$-409]#,##0"    ' 달러 (그냥 "$"는 한국 윈도에서 원화 기호로 바뀜)
        ch.Axes(2, 2).HasMajorGridlines = False
    Else
        ch.Axes(2).TickLabels.NumberFormat = IIf(hasKR, "#,##0", "[$$-409]#,##0")
    End If
End Sub

'=============================================================== 폭 맞추기 (틀 칸 안의 그림/차트를 칸 폭에)
Public Sub RFS_FitWidth(control As IRibbonControl)
    On Error GoTo eh
    Dim w As Single, ish As InlineShape, shp As Shape, n As Long
    If Selection.InlineShapes.Count = 0 And Selection.ShapeRange.Count = 0 Then
        If Selection.Information(wdWithInTable) Then
            If Selection.Cells(1).Range.InlineShapes.Count > 0 Then Selection.Cells(1).Range.InlineShapes(1).Select
        End If
    End If
    If Not Selection.Information(wdWithInTable) Then
        MsgBox "자료 틀 칸 안의 그림/차트를 클릭한 뒤 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    w = Selection.Cells(1).Width - 6
    For Each ish In Selection.InlineShapes
        ish.LockAspectRatio = (ish.Type <> wdInlineShapeChart)
        ish.Width = w
        n = n + 1
    Next ish
    On Error Resume Next
    For Each shp In Selection.ShapeRange
        shp.LockAspectRatio = True: shp.Width = w: n = n + 1
    Next shp
    On Error GoTo eh
    If n = 0 Then MsgBox "선택된 그림/차트가 없습니다.", vbExclamation, "RFS" Else Application.StatusBar = "RFS 폭 맞추기: " & Format(w / 28.35, "0.0#") & "cm"
    Exit Sub
eh: fail "폭 맞추기"
End Sub

'=============================================================== 자료 틀 페이지 걸침 점검
Private Function CheckFrameSplit() As Long
    On Error Resume Next
    Dim t As Table, p1 As Long, p2 As Long, n As Long
    For Each t In ActiveDocument.Tables
        If t.rows.Count = 3 And Left$(Trim$(t.rows(1).Range.Text), 3) = "[자료" Then
            p1 = t.Range.Information(wdActiveEndPageNumber)
            p2 = t.rows(3).Range.Information(wdActiveEndPageNumber)
            If p1 <> p2 Then
                t.rows(1).Range.HighlightColorIndex = wdViolet: n = n + 1
            End If
        End If
    Next t
    CheckFrameSplit = n
End Function

'=============================================================== Peer Historical P/E 차트 (Peer 평균 회색 면 + Peer 파랑 선 + 대상 빨간 선)
Public Sub RFS_PeerPEChart(control As IRibbonControl)
    On Error GoTo eh
    Dim grid() As String, nr As Long, nc As Long, g2() As String, i As Long, j As Long, tcol As Long, ans As String
    Dim sum As Double, cnt As Long, v As Variant, ch As Object, ser As Object, k As Long, blues As Variant, npeer As Long
    If Not Selection.Information(wdWithInTable) Then
        MsgBox "자료 틀의 가운데 칸(차트 자리)에 커서를 두고 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    If Not ParseClip(grid, nr, nc) Then
        MsgBox "먼저 엑셀에서 범위를 복사하세요. 첫 열 = 날짜, 첫 행 = 회사명, 각 열 = 12개월 선행 PER." & vbCrLf & _
               "블룸버그: =BDH(""089030 KS Equity"",""BEST_PE_RATIO"",""2024-01-01"",""2024-12-31"")  (PBR: BEST_PX_BPS_RATIO, EV/EBITDA: BEST_EV_TO_BEST_EBITDA)", vbExclamation, "RFS": Exit Sub
    End If
    If nc < 3 Then MsgBox "Peer가 최소 1개 + 대상 회사 1개, 즉 값 열이 2개 이상이어야 합니다.", vbExclamation, "RFS": Exit Sub
    ans = InputBox("대상 회사(빨간 선)는 몇 번째 값 열입니까? (1=" & grid(1, 2) & " ... " & (nc - 1) & "=" & grid(1, nc) & ")", "RFS Peer 멀티플 차트", CStr(nc - 1))
    If ans = "" Or Not IsNumeric(ans) Then Exit Sub
    tcol = CLng(ans) + 1
    If tcol < 2 Or tcol > nc Then Exit Sub
    ' 새 그리드: 날짜 | Peer Mean | Peer들... | 대상
    npeer = nc - 2
    ReDim g2(1 To nr, 1 To nc + 1)
    g2(1, 1) = grid(1, 1): g2(1, 2) = "Peer Mean"
    k = 2
    For j = 2 To nc
        If j <> tcol Then k = k + 1: g2(1, k) = grid(1, j)
    Next j
    g2(1, nc + 1) = grid(1, tcol)
    For i = 2 To nr
        g2(i, 1) = grid(i, 1)
        sum = 0: cnt = 0: k = 2
        For j = 2 To nc
            If j <> tcol Then
                k = k + 1: g2(i, k) = grid(i, j)
                v = ToNum(grid(i, j)): If IsNumeric(v) Then sum = sum + v: cnt = cnt + 1
            End If
        Next j
        g2(i, 2) = IIf(cnt > 0, Format(sum / cnt, "0.00"), "")
        g2(i, nc + 1) = grid(i, tcol)
    Next i
    Application.ScreenUpdating = False
    MakeChartFromGrid "line", g2, nr, nc + 1
    DateAxis 2
    Set ch = Selection.Cells(1).Range.InlineShapes(1).Chart
    On Error Resume Next
    ' Peer Mean: 회색 면
    Set ser = ch.SeriesCollection(1)
    ser.ChartType = 1                                    ' xlArea
    ser.Format.Fill.Visible = True: ser.Format.Fill.ForeColor.RGB = HexRGB("D0CECE"): ser.Format.Fill.Transparency = 0
    ser.Format.Line.Visible = False
    ' Peer들: 파랑 계열
    blues = Array("203864", "2F5597", "4472C4", "8FAADC", "5B9BD5", "B4C7E7", "9DC3E6", "7F7F7F", "BFBFBF")
    For k = 2 To nc
        Set ser = ch.SeriesCollection(k)
        ser.ChartType = 4
        ser.Format.Line.Visible = True
        ser.Format.Line.ForeColor.RGB = HexRGB(blues((k - 2) Mod 9))
        ser.Format.Line.Weight = 1.5
        ser.MarkerStyle = -4142
    Next k
    ' 대상 회사: 빨간 굵은 선
    Set ser = ch.SeriesCollection(nc + 1)
    ser.ChartType = 4
    ser.Format.Line.Visible = True: ser.Format.Line.ForeColor.RGB = HexRGB("C00000"): ser.Format.Line.Weight = 2.25
    ser.MarkerStyle = -4142
    ' 축 소수점: 값이 작으면(PBR, EV/EBITDA) 0.0, 크면(PER) 0
    Dim mx As Double
    For i = 2 To nr
        For j = 2 To nc
            v = ToNum(grid(i, j)): If IsNumeric(v) Then If v > mx Then mx = v
        Next j
    Next i
    ch.Axes(2).TickLabels.NumberFormat = IIf(mx < 15, "0.0", "0")
    ch.Axes(2).MinimumScale = 0
    ch.HasLegend = True: ch.Legend.Position = -4160
    On Error GoTo eh
    Application.ScreenUpdating = True
    Application.StatusBar = "RFS Peer 멀티플 차트: Peer " & npeer & "개 평균(회색) + " & grid(1, tcol) & "(빨강)"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "Peer 멀티플 차트"
End Sub

'=============================================================== 차트 양식 적용 (사람이 그린 차트를 RFS 서식으로)
Private Function IsLineType(ByVal t As Long) As Boolean
    IsLineType = (t = 4 Or t = 65 Or t = 63 Or t = 64 Or t = 66 Or t = 67 Or t = -4169 Or t = 72 Or t = 73 Or t = 74 Or t = 75)
End Function
Private Function IsAreaType(ByVal t As Long) As Boolean
    IsAreaType = (t = 1 Or t = 76 Or t = 77 Or t = 78 Or t = 79 Or t = 80)
End Function
Private Function IsPieType(ByVal t As Long) As Boolean
    IsPieType = (t = 5 Or t = -4120 Or t = 69 Or t = 70 Or t = 71 Or t = 68)
End Function

Private Function FindChartHere(ByRef ish As InlineShape) As Boolean
    On Error Resume Next
    Dim x As InlineShape
    If Selection.InlineShapes.Count > 0 Then
        Set x = Selection.InlineShapes(1)
        If x.Type = wdInlineShapeChart Then Set ish = x: FindChartHere = True: Exit Function
    End If
    If Selection.Information(wdWithInTable) Then
        For Each x In Selection.Cells(1).Range.InlineShapes
            If x.Type = wdInlineShapeChart Then Set ish = x: FindChartHere = True: Exit Function
        Next x
    End If
End Function

Public Sub RFS_RestyleChart(control As IRibbonControl)
    On Error GoTo eh
    Dim ish As InlineShape, ch As Object, ser As Object, i As Long, n As Long, t As Long, w As Single, h As Single
    Dim nLine As Long, nBar As Long, hasSec As Boolean, pieSer As Object
    If Not FindChartHere(ish) Then
        MsgBox "차트를 클릭하거나, 차트가 들어 있는 자료 칸에 커서를 두고 누르세요." & vbCrLf & "(차트로 붙여넣은 것만 됩니다. 그림으로 붙인 건 안 됩니다)", vbExclamation, "RFS": Exit Sub
    End If
    Set ch = ish.Chart
    Application.ScreenUpdating = False
    If ish.Range.Information(wdWithInTable) Then
        w = ish.Range.Cells(1).Width - 6
        ish.LockAspectRatio = False
        h = ish.Height * (w / ish.Width): If h < 60 Or h > 400 Then h = CentimetersToPoints(IIf(w > CentimetersToPoints(15), 6, 3.5))
        ish.Width = w: ish.Height = h
    End If
    On Error Resume Next
    n = ch.SeriesCollection.Count
    ch.HasTitle = False
    ch.ChartArea.Format.Fill.Visible = False: ch.ChartArea.Format.Line.Visible = False
    ch.PlotArea.Format.Fill.Visible = False: ch.PlotArea.Format.Line.Visible = False
    ch.ChartArea.Font.name = "KoPubWorld돋움체 Medium": ch.ChartArea.Font.Size = 7: ch.ChartArea.Font.color = RGB(0, 0, 0)
    ch.ChartArea.RoundedCorners = False
    For i = 1 To n
        Set ser = ch.SeriesCollection(i)
        t = ser.ChartType
        If IsPieType(t) Then
            Set pieSer = ser
        ElseIf IsLineType(t) Then
            nLine = nLine + 1
            ser.Format.Line.Visible = True
            ser.Format.Line.ForeColor.RGB = Palette(i)
            ser.Format.Line.Weight = 1.75
            ser.MarkerStyle = -4142
            ser.Smooth = False
        ElseIf IsAreaType(t) Then
            ser.Format.Fill.Visible = True: ser.Format.Fill.ForeColor.RGB = Palette(i): ser.Format.Line.Visible = False
        Else
            nBar = nBar + 1
            ser.Format.Fill.Visible = True: ser.Format.Fill.ForeColor.RGB = Palette(i): ser.Format.Line.Visible = False
        End If
        If ser.AxisGroup = 2 Then hasSec = True
        If ser.HasDataLabels Then
            ser.DataLabels.Font.name = "KoPubWorld돋움체 Medium": ser.DataLabels.Font.Size = 7: ser.DataLabels.Font.color = RGB(0, 0, 0)
        End If
    Next i
    If Not pieSer Is Nothing Then
        For i = 1 To pieSer.Points.Count
            pieSer.Points(i).Format.Fill.ForeColor.RGB = Palette(i)
            pieSer.Points(i).Format.Line.ForeColor.RGB = RGB(255, 255, 255): pieSer.Points(i).Format.Line.Weight = 1
        Next i
        If pieSer.HasDataLabels Then
            pieSer.DataLabels.Font.name = "KoPubWorld돋움체 Medium": pieSer.DataLabels.Font.Size = 7: pieSer.DataLabels.Font.color = RGB(0, 0, 0)
        End If
        ch.HasLegend = True
    Else
        StyleAxis ch.Axes(1, 1), 7
        StyleAxis ch.Axes(2, 1), 7
        If hasSec Then StyleAxis ch.Axes(2, 2), 7: ch.Axes(2, 2).HasMajorGridlines = False
        If nBar > 0 Then ch.ChartGroups(1).GapWidth = 60
        ch.HasLegend = (n > 1)
    End If
    If ch.HasLegend Then
        ch.Legend.Position = -4160
        ch.Legend.Font.name = "KoPubWorld돋움체 Medium": ch.Legend.Font.Size = 7: ch.Legend.Font.color = RGB(0, 0, 0)
        ch.Legend.Format.Fill.Visible = False: ch.Legend.Format.Line.Visible = False
    End If
    On Error GoTo eh
    Application.ScreenUpdating = True
    Application.StatusBar = "RFS 차트 양식: 계열 " & n & "개 (선 " & nLine & ", 막대 " & nBar & ")"
    Exit Sub
eh: Application.ScreenUpdating = True: fail "차트 양식"
End Sub

'=============================================================== 추정치 구분 (E/F 항목: 막대는 연한 색, 선은 점선)
Private Function IsEstimateLabel(ByVal v As Variant) As Boolean
    Dim re As Object
    On Error Resume Next
    Set re = CreateObject("VBScript.RegExp"): re.IgnoreCase = True
    re.pattern = "\d\s*[EF]$"
    IsEstimateLabel = re.Test(Trim$(CStr(v)))
End Function

Private Function LighterOf(ByVal c As Long) As Long
    Select Case c
        Case HexRGB("203864"): LighterOf = HexRGB("8FAADC")
        Case HexRGB("2F5597"): LighterOf = HexRGB("B4C7E7")
        Case HexRGB("8FAADC"): LighterOf = HexRGB("B4C7E7")
        Case HexRGB("D0CECE"): LighterOf = HexRGB("E7E6E6")
        Case HexRGB("595959"): LighterOf = HexRGB("A6A6A6")
        Case HexRGB("C00000"): LighterOf = HexRGB("F4B6B6")
        Case Else: LighterOf = HexRGB("B4C7E7")
    End Select
End Function

Public Sub RFS_ChartEstimate(control As IRibbonControl)
    On Error GoTo eh
    Dim ish As InlineShape, ch As Object, ser As Object, i As Long, k As Long, cats As Variant, n As Long, t As Long
    If Not FindChartHere(ish) Then
        MsgBox "차트를 클릭하거나, 차트가 들어 있는 자료 칸에 커서를 두고 누르세요.", vbExclamation, "RFS": Exit Sub
    End If
    Set ch = ish.Chart
    Application.ScreenUpdating = False
    On Error Resume Next
    For k = 1 To ch.SeriesCollection.Count
        Set ser = ch.SeriesCollection(k)
        t = ser.ChartType
        If IsPieType(t) Then GoTo nextSer
        cats = ser.XValues
        For i = LBound(cats) To UBound(cats)
            If IsEstimateLabel(cats(i)) Then
                If IsLineType(t) Then
                    ser.Points(i - LBound(cats) + 1).Format.Line.DashStyle = 11      ' msoLineSysDot
                Else
                    ser.Points(i - LBound(cats) + 1).Format.Fill.ForeColor.RGB = LighterOf(ser.Format.Fill.ForeColor.RGB)
                End If
                n = n + 1
            End If
        Next i
nextSer:
    Next k
    On Error GoTo eh
    Application.ScreenUpdating = True
    If n = 0 Then
        MsgBox "추정치 항목이 없습니다. 가로축 항목 이름이 2026E, '26E, 4Q26E처럼 E로 끝나야 합니다.", vbInformation, "RFS"
    Else
        Application.StatusBar = "RFS 추정치 구분: " & n & "개 지점 (막대 연한 색 / 선 점선)"
    End If
    Exit Sub
eh: Application.ScreenUpdating = True: fail "추정치 구분"
End Sub

'=============================================================== 강조 도형 (리포트에서 실제로 쓰인 형태)


' 점선 상자: 빨간 점선 테두리, 채움 없음 (구간·영역 강조)

' 점선 원: 특정 지점 강조

' 점선 화살표: 전망·예상 방향

' 이벤트 선: 세로 점선 + 위쪽 빨간 라벨 (출시·발표·사건 시점)

' 구간 음영: 세로 반투명 파랑 띠 (기간 강조, 빨간 강조 상자와 짝)

' 괄호: 여러 항목 묶기 (검정 0.25pt). 회전·대칭은 도형 서식에서

' 남색 메모: 시점별 사건 메모 (6pt 볼드 남색)

' 흰 라벨: 흰 바탕 빨간 글 (선·눈금 위에서도 읽히게)

' CAGR: 대각 화살표 + 빨간 라벨 (막대 추세)

'=============================================================== 주석 도형 (공통: 이름표를 붙이고 이름으로 다시 찾아 쓰기)
' 표 칸 안의 도형은 배치 속성을 바꾸면 워드가 새로 만들어 기존 참조가 끊긴다(오류 5825). 그래서 참조 대신 이름으로 다룬다.
Private Function ShapeNames() As String
    Dim s As Shape, t As String
    t = "|"
    For Each s In ActiveDocument.Shapes
        t = t & s.name & "|"
    Next s
    ShapeNames = t
End Function

Private Function Adopt(ByVal before As String) As String
    Dim s As Shape, nm As String
    For Each s In ActiveDocument.Shapes
        If InStr(before, "|" & s.name & "|") = 0 Then
            nm = "RFS_" & Replace(Format(Timer, "0.00"), ".", "") & "_" & ActiveDocument.Shapes.Count
            On Error Resume Next
            s.name = nm
            If Err.Number <> 0 Then nm = s.name: Err.Clear
            On Error GoTo 0
            Adopt = nm
            Exit Function
        End If
    Next s
End Function

Private Function Sh(ByVal nm As String) As Shape
    On Error Resume Next
    Set Sh = ActiveDocument.Shapes(nm)
End Function

Private Sub PlaceByName(ByVal nm As String, ByVal x As Single, ByVal y As Single)
    On Error Resume Next
    Sh(nm).WrapFormat.Type = 3            ' 텍스트 앞
    Sh(nm).LayoutInCell = True
    Sh(nm).RelativeHorizontalPosition = 2  ' 단
    Sh(nm).RelativeVerticalPosition = 2    ' 문단
    Sh(nm).LockAnchor = False
    Sh(nm).Left = x
    Sh(nm).Top = y
End Sub

Private Sub PickByName(ByVal nm As String, Optional ByVal textInside As Boolean = False)
    On Error Resume Next
    If textInside Then Sh(nm).TextFrame.TextRange.Select Else Sh(nm).Select
End Sub

Private Function NewBox(ByVal shapeType As Long, ByVal w As Single, ByVal h As Single) As String
    Dim before As String
    before = ShapeNames()
    ActiveDocument.Shapes.AddShape shapeType, 0, 0, w, h, AnchorRange()
    NewBox = Adopt(before)
    If NewBox = "" Then Err.Raise vbObjectError + 50, , "도형을 만들지 못했습니다."
End Function

Private Function NewLine(ByVal x1 As Single, ByVal y1 As Single, ByVal x2 As Single, ByVal y2 As Single) As String
    Dim before As String
    before = ShapeNames()
    ActiveDocument.Shapes.AddLine x1, y1, x2, y2, AnchorRange()
    NewLine = Adopt(before)
    If NewLine = "" Then Err.Raise vbObjectError + 50, , "선을 만들지 못했습니다."
End Function


Private Sub SetLineLook(ByVal nm As String, ByVal colorHex As String, ByVal wt As Single, ByVal dash As Long, ByVal arrowEnd As Boolean)
    With Sh(nm).Line
        .Visible = True
        .ForeColor.RGB = HexRGB(colorHex): .Weight = wt: .DashStyle = dash
        If arrowEnd Then .EndArrowheadStyle = 2: .EndArrowheadLength = 2: .EndArrowheadWidth = 2
    End With
End Sub


' 화살표
Public Sub RFS_AnnotArrow(control As IRibbonControl)
    On Error GoTo eh
    Dim nm As String
    nm = NewLine(0, 0, 60, 0)
    SetLineLook nm, "C00000", 0.75, 1, True
    PlaceByName nm, 10, 20: PickByName nm
    Exit Sub
eh: fail "화살표"
End Sub

' 강조 상자: 반투명 빨강
Public Sub RFS_AnnotBox(control As IRibbonControl)
    On Error GoTo eh
    Dim nm As String
    nm = NewBox(1, 60, 50)
    With Sh(nm)
        .Fill.Visible = True: .Fill.ForeColor.RGB = HexRGB("C00000"): .Fill.Transparency = 0.9
        .Line.Visible = False
    End With
    PlaceByName nm, 10, 10: PickByName nm
    Exit Sub
eh: fail "강조 상자"
End Sub

' 점선 상자
Public Sub RFS_DashBox(control As IRibbonControl)
    On Error GoTo eh
    Dim nm As String
    nm = NewBox(1, 80, 50)
    Sh(nm).Fill.Visible = False
    SetLineLook nm, "C00000", 1.25, 10, False
    PlaceByName nm, 10, 10: PickByName nm
    Exit Sub
eh: fail "점선 상자"
End Sub

' 점선 원
Public Sub RFS_DashCircle(control As IRibbonControl)
    On Error GoTo eh
    Dim nm As String
    nm = NewBox(9, 28, 28)
    Sh(nm).Fill.Visible = False
    SetLineLook nm, "C00000", 1.25, 4, False
    PlaceByName nm, 10, 10: PickByName nm
    Exit Sub
eh: fail "점선 원"
End Sub

' 점선 화살표
Public Sub RFS_DashArrow(control As IRibbonControl)
    On Error GoTo eh
    Dim nm As String
    nm = NewLine(0, 0, 60, 0)
    SetLineLook nm, "C00000", 1, 4, True
    PlaceByName nm, 10, 20: PickByName nm
    Exit Sub
eh: fail "점선 화살표"
End Sub


' 구간 음영: 세로 반투명 파랑 띠
Public Sub RFS_PeriodBand(control As IRibbonControl)
    On Error GoTo eh
    Dim nm As String
    nm = NewBox(1, 40, 100)
    With Sh(nm)
        .Fill.Visible = True: .Fill.ForeColor.RGB = HexRGB("B4C7E7"): .Fill.Transparency = 0.5
        .Line.Visible = False
    End With
    PlaceByName nm, 60, 10
    On Error Resume Next
    Sh(nm).ZOrder 1
    On Error GoTo eh
    PickByName nm
    Exit Sub
eh: fail "구간 음영"
End Sub




' CAGR: 대각 화살표 + 라벨

Public Sub RFS_AnnotText(control As IRibbonControl)
    On Error GoTo eh
    Dim shp As Shape
    Set shp = ActiveDocument.Shapes.AddTextbox(1, 0, 0, 90, 18, AnchorRange())
    With shp
        .Fill.Visible = False: .Line.Visible = False
        .TextFrame.MarginLeft = 0: .TextFrame.MarginRight = 0: .TextFrame.MarginTop = 0: .TextFrame.MarginBottom = 0
        .TextFrame.AutoSize = True
        .TextFrame.WordWrap = True
        With .TextFrame.TextRange
            .Text = "주석 입력"
            .Font.name = "KoPubWorld돋움체 Bold": .Font.NameFarEast = "KoPubWorld돋움체 Bold"
            .Font.Size = 7: .Font.color = HexRGB("C00000")
            .ParagraphFormat.Alignment = wdAlignParagraphLeft
            .ParagraphFormat.SpaceAfter = 0
        End With
    End With
    PlaceShape shp
    shp.TextFrame.TextRange.Select
    Exit Sub
eh: fail "주석 글"
End Sub

' 글상자 (빨간 글과 같은 원래 방식: 참조를 들고 서식 → 배치)
Private Function OldLabel(ByVal txt As String, ByVal colorHex As String, ByVal sz As Single) As Shape
    Dim shp As Shape
    Set shp = ActiveDocument.Shapes.AddTextbox(1, 0, 0, 90, 18, AnchorRange())
    With shp
        .Fill.Visible = False: .Line.Visible = False
        .TextFrame.MarginLeft = 0: .TextFrame.MarginRight = 0: .TextFrame.MarginTop = 0: .TextFrame.MarginBottom = 0
        .TextFrame.AutoSize = True
        .TextFrame.WordWrap = True
        With .TextFrame.TextRange
            .Text = txt
            .Font.name = "KoPubWorld돋움체 Bold": .Font.NameFarEast = "KoPubWorld돋움체 Bold"
            .Font.Size = sz: .Font.color = HexRGB(colorHex)
            .ParagraphFormat.Alignment = wdAlignParagraphLeft
            .ParagraphFormat.SpaceAfter = 0
        End With
    End With
    Set OldLabel = shp
End Function

' PlaceShape와 같은 순서, 위치만 지정
Private Sub PlaceShapeAt(shp As Shape, ByVal x As Single, ByVal y As Single)
    On Error Resume Next
    With shp
        .RelativeHorizontalPosition = 2
        .RelativeVerticalPosition = 2
        .Left = x: .Top = y
        .LayoutInCell = True
        .WrapFormat.Type = 3
        .LockAnchor = False
    End With
End Sub

' 남색 메모
Public Sub RFS_NavyNote(control As IRibbonControl)
    On Error GoTo eh
    Dim shp As Shape
    Set shp = OldLabel("MM/DD, 메모", "203864", 6)
    PlaceShape shp
    shp.TextFrame.TextRange.Select
    Exit Sub
eh: fail "남색 메모"
End Sub

' 이벤트 선: 세로 점선(이름 방식) + 라벨(원래 방식)
Public Sub RFS_EventLine(control As IRibbonControl)
    On Error GoTo eh
    Dim ln As String, lb As Shape
    ln = NewLine(0, 0, 0, 90)
    SetLineLook ln, "C00000", 1, 10, False
    PlaceByName ln, 60, 14
    Set lb = OldLabel("이벤트", "C00000", 7)
    PlaceShapeAt lb, 44, 2
    lb.TextFrame.TextRange.Select
    Exit Sub
eh: fail "이벤트 선"
End Sub
