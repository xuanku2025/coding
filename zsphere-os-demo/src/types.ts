export interface VMSpec {
    key: string;
    name: string;
    os: 'Windows' | 'Linux';
    desc: string;
    networkType: 'Workgroup' | 'Domain' | '-';
    hostname: string;
}
