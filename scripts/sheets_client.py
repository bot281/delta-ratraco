"""
Google Sheets API client wrapper
"""
import json
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from config import SHEET_ID, SCOPES, SERVICE_ACCOUNT_FILE


def get_service():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return build('sheets', 'v4', credentials=creds).spreadsheets()


def read_sheet(service, sheet_name: str, range_str: str = '') -> pd.DataFrame:
    """Đọc sheet → DataFrame"""
    rng = f"'{sheet_name}'!{range_str}" if range_str else f"'{sheet_name}'"
    result = service.values().get(
        spreadsheetId=SHEET_ID,
        valueRenderOption='UNFORMATTED_VALUE',
        dateTimeRenderOption='FORMATTED_STRING',
        range=rng,
    ).execute()
    rows = result.get('values', [])
    if not rows:
        return pd.DataFrame()
    headers = rows[0]
    data = rows[1:]
    # Pad rows thiếu cột
    data = [r + [''] * (len(headers) - len(r)) for r in data]
    return pd.DataFrame(data, columns=headers)


def write_sheet(service, sheet_name: str, start_cell: str,
                data: list, clear_first: bool = True):
    """Ghi list of lists vào sheet"""
    rng = f"'{sheet_name}'!{start_cell}"
    if clear_first:
        service.values().clear(
            spreadsheetId=SHEET_ID, range=rng
        ).execute()
    service.values().update(
        spreadsheetId=SHEET_ID,
        range=rng,
        valueInputOption='USER_ENTERED',
        body={'values': data}
    ).execute()
    print(f"  ✓ Đã ghi {len(data)} dòng → {sheet_name}!{start_cell}")
