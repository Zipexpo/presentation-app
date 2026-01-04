'use client';
import { Link as LinkIcon, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getLinkType } from '@/lib/utils';

const LinkBadge = ({ url, type: propType, className }) => {
    const type = propType || getLinkType(url);
    if (!type) return null;

    let icon = <LinkIcon className="w-3 h-3" />;
    let colorClass = "bg-gray-100 text-gray-800 border-gray-200"; // Default

    switch (type) {
        case 'Google Slides':
            icon = <img src="/logo%20icon/google_slides.svg" alt="Google Slides" className="w-3 h-3" />;
            colorClass = "bg-orange-100 text-orange-800 border-orange-200";
            break;
        case 'Canva':
            icon = <img src="/logo%20icon/canva.svg" alt="Canva" className="w-3 h-3" />;
            colorClass = "bg-blue-100 text-blue-800 border-blue-200";
            break;
        case 'Figma':
            icon = <img src="/logo%20icon/figma.svg" alt="Figma" className="w-3 h-3" />;
            colorClass = "bg-purple-100 text-purple-800 border-purple-200";
            break;
        case 'PowerPoint':
            icon = <img src="/logo%20icon/powerpoint.svg" alt="PowerPoint" className="w-3 h-3" />;
            colorClass = "bg-red-100 text-red-800 border-red-200";
            break;
        case 'YouTube':
            icon = <img src="/logo%20icon/youtube.svg" alt="YouTube" className="w-3 h-3" />;
            colorClass = "bg-red-50 text-red-600 border-red-200";
            break;
        case 'Vimeo':
            icon = <img src="/logo%20icon/vimeo.svg" alt="Vimeo" className="w-3 h-3" />;
            colorClass = "bg-sky-100 text-sky-800 border-sky-200";
            break;
        case 'Google Drive':
            icon = <img src="/logo%20icon/google_drive.svg" alt="Drive" className="w-3 h-3" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.style && (e.target.nextSibling.style.display = 'block') }} />;
            colorClass = "bg-green-100 text-green-800 border-green-200";
            break;
        case 'OneDrive':
            icon = <img src="/logo%20icon/onedrive.svg" alt="OneDrive" className="w-3 h-3" />;
            colorClass = "bg-blue-100 text-blue-800 border-blue-200";
            break;
        case 'GitHub':
            icon = <img src="/logo%20icon/github.svg" alt="GitHub" className="w-3 h-3" />;
            colorClass = "bg-gray-100 text-gray-900 border-gray-200";
            break;
        case 'GitLab':
            icon = <img src="/logo%20icon/gitlab.svg" alt="GitLab" className="w-3 h-3" />;
            colorClass = "bg-orange-100 text-orange-800 border-orange-200";
            break;
        case 'Prezi':
            icon = <img src="/logo%20icon/prezi.svg" alt="Prezi" className="w-3 h-3" />;
            colorClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
            break;
        case 'Pitch':
            icon = <img src="/logo%20icon/pitch.svg" alt="Pitch" className="w-3 h-3" />;
            colorClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
            break;
        case 'Google Docs':
            icon = <FileText className="w-3 h-3 text-blue-600" />;
            colorClass = "bg-blue-50 text-blue-700 border-blue-200";
            break;
        case 'PDF':
            icon = <FileText className="w-3 h-3 text-red-600" />;
            colorClass = "bg-red-50 text-red-700 border-red-200";
            break;
        case 'Word':
            icon = <FileText className="w-3 h-3 text-blue-800" />;
            colorClass = "bg-blue-50 text-blue-800 border-blue-200";
            break;
        case 'presentation':
            icon = <img src="/logo%20icon/google_slides.svg" alt="Slides" className="w-3 h-3" />;
            colorClass = "bg-orange-100 text-orange-800 border-orange-200";
            break;
        case 'video':
            icon = <img src="/logo%20icon/youtube.svg" alt="Video" className="w-3 h-3" />;
            colorClass = "bg-red-50 text-red-600 border-red-200";
            break;
        case 'code':
            icon = <img src="/logo%20icon/github.svg" alt="Code" className="w-3 h-3" />;
            colorClass = "bg-gray-100 text-gray-900 border-gray-200";
            break;
        case 'document':
            icon = <FileText className="w-3 h-3 text-blue-600" />;
            colorClass = "bg-blue-50 text-blue-700 border-blue-200";
            break;
        case 'spreadsheet':
            icon = <FileText className="w-3 h-3 text-green-600" />;
            colorClass = "bg-green-50 text-green-700 border-green-200";
            break;
    }

    return (
        <Badge variant="outline" className={`ml-2 gap-1.5 px-2 py-0.5 h-6 font-normal ${colorClass} ${className}`}>
            {icon}
            {type}
        </Badge>
    );
};

export default LinkBadge;
