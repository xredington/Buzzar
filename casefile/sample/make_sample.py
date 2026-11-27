#!/usr/bin/env python3
"""Writes fictional orders into sample/inbox so the register can be tried without real files.

    python3 sample/make_sample.py && python3 casefile.py run --data sample --offline

Every party, advocate, file number and fact here is invented. Needs reportlab.
"""
import shutil
import textwrap
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
BANNER = 'SAMPLE ORDER. FICTIONAL, FOR DEMONSTRATION ONLY.'

# (file line, party A, party B, counsel A, counsel B, layout, [(date, body, closing line)])
CASES = [
    ('File No. APL/1042/2023', 'Meridian Agro Foods Pvt. Ltd.', 'Deputy Commissioner (Licensing)',
     'Mr. R. Khanna, Advocate', 'Ms. S. Iyer, Advocate', 'versus', [
        ('12.09.2023', 'This appeal is directed against the order dated 03.08.2023 cancelling the appellant\'s cold storage licence for non-payment of the renewal fee. The appellant says no show cause notice was ever served on it. Issue notice to the respondent. The cancellation is stayed subject to the appellant depositing the renewal fee of Rs. 2,40,000 within two weeks.',
         'List on 06.02.2024 for reply.'),
        ('06.02.2024', 'Reply has been filed by the respondent and a copy supplied. The respondent states the show cause notice was sent by registered post on 14.06.2023. Counsel for the appellant seeks time to file a rejoinder. Time is granted.',
         'List on 16.07.2024.'),
        ('16.07.2024', 'Rejoinder is taken on record. The appellant disputes that any registered article was received. The respondent is directed to produce the original dispatch register and the postal receipt on the next date.',
         'Adjourned to 04.03.2025 for production of record.'),
        ('04.03.2025', 'The dispatch register has been produced. Counsel for the appellant points out that the acknowledgment card bears a signature that is not of any employee of the appellant. The respondent shall file an affidavit of the dealing clerk explaining how service was effected.',
         'List on 18.08.2026 for final arguments.'),
        ('18.08.2026', 'Affidavit of the dealing clerk is on record. Arguments of the appellant heard and concluded on the question of service. The matter is part-heard. The respondent will address arguments on the next date, and on whether the defect, if any, can be cured by a fresh hearing.',
         'List on 30.11.2026 for arguments of the respondent.'),
     ]),
    ('Appeal No. 218/2024', 'Harbans Lal', 'Estate Officer', 'Mr. P. S. Gill, Advocate', 'Mr. Anil Verma, Advocate', 'oneline', [
        ('9th April, 2024', 'The appellant challenges the resumption of Plot No. 47, Sector 9 for not completing construction within the period allowed. He says the delay was caused by the respondent\'s own failure to sanction the building plan for 19 months. Issue notice. The respondent shall file the record of the building plan application.',
         'List on 23rd July, 2024 for reply and record.'),
        ('23rd July, 2024', 'No reply has been filed. Counsel for the respondent seeks time on the ground that the file is with the head office. Time is granted as a last indulgence.',
         'List on 19th November, 2024.'),
        ('19th November, 2024', 'Reply is still not filed. Counsel for the respondent again requests an adjournment. The request is opposed. In the interest of justice one more opportunity is granted.',
         'List on 20th May, 2025 for reply.'),
        ('20th May, 2025', 'The respondent has filed a short reply without the building plan record. Counsel for the respondent seeks further time to trace the record. A last opportunity is granted subject to costs of Rs. 5,000 to be paid to the appellant. If the record is not produced, an adverse inference will be drawn.',
         'List on 30th November, 2026 for production of record and final arguments.'),
     ]),
    ('File No. APL/0377/2024', 'Northline Logistics LLP', 'Assessing Authority, Circle II',
     'Ms. Farah Qureshi, Advocate', 'Mr. D. K. Bansal, Advocate', 'versus', [
        ('14/05/2024', 'The appeal is against a penalty of Rs. 18,40,000 imposed for late filing of quarterly returns for 2021-22. The appeal is filed 212 days beyond limitation and is accompanied by an application for condonation of delay. Notice on the application for condonation only at this stage.',
         'List on 10/09/2024 for reply to the application.'),
        ('10/09/2024', 'Reply to the condonation application is filed. The respondent says the penalty order was served by e-mail on 02.02.2023 and that the plea of the managing partner\'s illness is unsupported. The appellant is directed to file the medical record and proof of the date of knowledge by affidavit.',
         'List on 11/02/2025.'),
        ('11/02/2025', 'The affidavit with discharge summaries has been filed. The respondent seeks time to verify the documents. Time is granted.',
         'List on 30/11/2026 for arguments on condonation of delay.'),
     ]),
    ('File No. APL/0591/2022', 'Sunita Devi', 'Registrar of Co-operative Societies & Anr.',
     'Mr. Vikram Sethi, Advocate', 'Ms. Neha Arora, Advocate', 'versus', [
        ('02.08.2022', 'The appellant was removed from membership of the Shakti Nagar Co-operative House Building Society by a resolution dated 11.04.2022, confirmed by the Registrar on 20.06.2022, for alleged default in instalments. She says she paid Rs. 7,80,000 and holds receipts. Issue notice to both respondents. The society shall not allot Flat No. B-204 to any other person till further orders.',
         'List on 13.12.2022.'),
        ('13.12.2022', 'Reply of the society is filed. The Registrar adopts it. The society disputes four receipts as forged. The appellant is directed to produce the originals.',
         'List on 02.05.2023 for production of original receipts.'),
        ('02.05.2023', 'Original receipts are produced and seen. The society is directed to produce its cash book and receipt counterfoils for the period January 2019 to March 2021.',
         'List on 17.10.2023.'),
        ('17.10.2023', 'The cash book is produced. The counterfoils for four receipts are stated to be missing. Counsel for the society seeks time to file an affidavit of the treasurer. Time is granted.',
         'List on 09.04.2024.'),
        ('09.04.2024', 'Affidavit of the treasurer is filed. Parties state that pleadings are complete.',
         'List on 03.12.2024 for final arguments.'),
        ('03.12.2024', 'Arguments of the appellant heard in part. Counsel relied on the bank statement showing withdrawals matching the four disputed receipts. Part-heard.',
         'List on 30.11.2026 for remaining arguments.'),
     ]),
    ('File No. APL/0064/2025', 'Kaveri Polymers', 'Pollution Control Committee', 'Mr. S. Raghavan, Advocate',
     'Ms. Ritu Malhotra, Advocate', 'versus', [
        ('21 Jan 2025', 'The appeal challenges a closure direction dated 06.01.2025 issued on the ground that the appellant\'s effluent treatment plant was found non-functional. The appellant says the plant was under scheduled maintenance for 48 hours. Issue notice. Operation of the closure direction is stayed for one production line only, subject to a joint inspection.',
         'List on 08 Apr 2025 for the inspection report.'),
        ('08 Apr 2025', 'The joint inspection could not be held as the respondent\'s laboratory was not available. The respondent is directed to carry out the inspection within four weeks and file the report with sample analysis. The interim order shall continue.',
         'List on 30 Nov 2026 for the inspection report and hearing on continuation of stay.'),
     ]),
    ('File No. APL/0845/2025', 'Arvind Mehta', 'Sub-Registrar, Zone IV', 'Mr. Arvind Mehta, appellant in person',
     'None for the Respondent', 'versus', [
        ('03.06.2025', 'The appellant claims refund of excess stamp duty of Rs. 6,20,000 paid on a sale deed that was later cancelled by a decree. The refund application was rejected as time-barred. Issue notice to the respondent.',
         'List on 16.09.2025.'),
        ('16.09.2025', 'None appears for the respondent despite service. Fresh notice be issued by registered post and by e-mail.',
         'List on 10.02.2026.'),
        ('10.02.2026', 'None is present for the respondent again though service is complete. In the interest of justice one more opportunity is given. If nobody appears on the next date the appeal will be heard ex parte.',
         'List on 30.11.2026 for hearing.'),
     ]),
    ('File No. APL/0122/2026', 'Greenfield Schools Society', 'Director of Education', 'Ms. Anjali Deshmukh, Advocate',
     'None for the Respondent', 'versus', [
        ('03.11.2026', 'The appellant society challenges the order dated 12.10.2026 withdrawing recognition of its senior secondary section from the next academic session for shortfall in playground area. It says the adjoining plot was leased on 01.09.2026 and cures the shortfall. Issue notice to the respondent, returnable at an early date since admissions open in January.',
         'List on 01.12.2026 for reply and hearing on interim relief.'),
     ]),
    ('File No. APL/0930/2024', 'Tarun Electricals', 'Distribution Licensee (North)', 'Mr. Manoj Tiwari, Advocate',
     'Mr. H. S. Bedi, Advocate', 'versus', [
        ('05.11.2024', 'The appellant disputes a supplementary bill of Rs. 11,65,000 raised for alleged slow running of the meter between March 2022 and August 2023. Issue notice. Disconnection is stayed subject to deposit of 30 per cent of the bill.',
         'List on 25.03.2025 for reply.'),
        ('25.03.2025', 'Reply is filed with the meter testing report. The appellant says it was not present when the meter was tested. Both sides state that the matter may be settled if the billing period is restricted to six months.',
         'List on 14.10.2025 to report settlement.'),
        ('14.10.2025', 'Parties report that a revised bill of Rs. 4,10,000 has been proposed and is awaiting approval of the respondent\'s competent authority. Time is sought jointly.',
         'List on 01.12.2026 to report settlement, failing which for final arguments.'),
     ]),
    ('File No. APL/0456/2023', 'Blue Harbour Exports', 'Joint Commissioner (Refunds)', 'Mr. K. Narayan, Advocate',
     'Ms. Pooja Chawla, Advocate', 'versus', [
        ('07.03.2023', 'The appeal is against rejection of a refund claim of Rs. 42,10,000 for the quarter ending June 2021 on the ground that shipping bills were filed late. Issue notice.',
         'List on 25.07.2023 for reply.'),
        ('25.07.2023', 'Reply and rejoinder are on record. The respondent is directed to place the verification report of the shipping bills on file.',
         'List on 12.03.2024 for final arguments.'),
        ('27.10.2026', 'Arguments of both sides heard at length. The appellant relied on the circular dated 18.11.2021 extending time for filing. The respondent says the circular applies only prospectively. Written notes may be filed within one week. Order reserved.', ''),
     ]),
    ('File No. APL/0301/2025', 'Mohd. Irfan', 'Licensing Inspector', 'Mr. Yusuf Ali, Advocate', 'Mr. R. P. Joshi, Advocate', 'versus', [
        ('18.02.2025', 'The appellant challenges the sealing of his eating house for want of a health trade licence. Issue notice.',
         'List on 15.09.2026.'),
        ('15.09.2026', 'Counsel for the appellant states that the licence has since been granted and the premises de-sealed, and that he does not wish to press the appeal. The appeal is dismissed as withdrawn.', ''),
     ]),
    ('File No. APL/0712/2024', 'Lakshmi Textiles', 'Labour Welfare Board', 'Ms. Gauri Nair, Advocate',
     'Mr. Sandeep Rana, Advocate', 'versus', [
        ('20.08.2024', 'The appeal challenges a demand of Rs. 9,30,000 towards welfare cess for 2019-22 computed on the full wage bill including contract labour. Issue notice. Recovery is stayed subject to deposit of half the demand.',
         'List on 04.02.2025 for reply.'),
        ('04.02.2025', 'Reply is filed. The appellant is directed to file the contractor-wise wage registers.',
         'List on 24.11.2026 for final arguments.'),
     ]),
    ('File No. APL/0508/2025', 'Deepak Sood', 'Municipal Assessor', 'Mr. Deepak Sood, appellant in person',
     'Ms. Kavita Rao, Advocate', 'versus', [
        ('15.07.2025', 'The appellant disputes reassessment of property tax for House No. 1182 treating the first floor as let out. He says his son occupies it. Issue notice. The respondent shall file the inspection note relied on.',
         'List on 15.12.2026 for reply.'),
     ]),
    ('File No. APL/0019/2026', 'Orbit Diagnostics', 'District Health Authority', 'Mr. Tushar Goel, Advocate',
     'Mr. B. L. Meena, Advocate', 'versus', [
        ('03.02.2026', 'The appeal is against suspension of the appellant\'s registration for three months for incomplete record of procedures. Issue notice. Suspension is stayed till the next date.',
         'List on 21.07.2026 for reply.'),
        ('21.07.2026', 'Reply is filed. The appellant seeks time for rejoinder. Interim order to continue.',
         'List on 12.01.2027 for rejoinder and final arguments.'),
     ]),
    ('File No. APL/0660/2023', 'Rajni Bala', 'Regional Transport Authority', 'Mr. Naveen Pathak, Advocate',
     'Ms. Shalini Dutt, Advocate', 'versus', [
        ('06.06.2023', 'The appellant challenges refusal to renew her stage carriage permit on the Rampur to Kalka route on the ground of two pending challans. Issue notice.',
         'List on 21.11.2023 for reply.'),
        ('21.11.2023', 'Reply is filed. The appellant states both challans stand compounded and produces receipts. The respondent is directed to verify the receipts.',
         'List on 09.02.2027 for verification report and final arguments.'),
     ]),
]

# An order with no file number on it: the register cannot place it and says so.
STRAY = ('Present: None.\n\nORDER\n19.11.2026\n\nThe record has been received back from the copying section. '
         'Be placed with the main file.\n\nSd/-\nPresiding Member\n')


def order_text(file_line, a, b, ca, cb, layout, date, body, closing):
    top = ['BEFORE THE APPELLATE AUTHORITY', '']
    if layout == 'oneline':
        top += [file_line, f'{a} v. {b}', '']
    else:
        top += [file_line, '', f'{a}    ...... Appellant', 'Versus', f'{b}    ...... Respondent', '']
    present = [f'Present:  {ca}{"" if "in person" in ca else " for the Appellant"}',
               f'          {cb}{"" if cb.startswith("None") else " for the Respondent"}', '']
    return '\n'.join([BANNER, ''] + top + present + ['ORDER', date, '', body] + ([closing] if closing else []) +
                     ['', 'Sd/-', 'Presiding Member'])


def write_pdf(path, text):
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle('Sample order (fictional)')
    y = A4[1] - 60
    for line in text.split('\n'):
        for part in (textwrap.wrap(line, 88) or ['']):
            c.setFont('Times-Bold' if part.isupper() else 'Times-Roman', 11.5)
            c.drawString(64, y, part)
            y -= 17
            if y < 60:
                c.showPage()
                y = A4[1] - 60
    c.save()


def main():
    inbox = HERE / 'inbox'
    for stale in ('inbox', 'files', 'unfiled', 'duplicates'):
        shutil.rmtree(HERE / stale, ignore_errors=True)
    (HERE / 'register.json').unlink(missing_ok=True)
    inbox.mkdir()
    n = 0
    for file_line, a, b, ca, cb, layout, orders in CASES:
        for date, body, closing in orders:
            n += 1
            text = order_text(file_line, a, b, ca, cb, layout, date, body, closing)
            # Names as they come off a court website: no help to the reader.
            name = f'order_{n:03d}'
            if n % 9 == 0:
                (inbox / f'{name}.txt').write_text(text, 'utf-8')
            else:
                write_pdf(inbox / f'{name}.pdf', text)
    (inbox / 'scan_0042.txt').write_text(BANNER + '\n\n' + STRAY, 'utf-8')
    print(f'{n + 1} sample orders written to {inbox}')


if __name__ == '__main__':
    main()
